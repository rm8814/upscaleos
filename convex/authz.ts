import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Access control for the management-company (account) model.
 *
 * Tenancy: an `accounts` row is a management company. It owns `properties` and
 * has `account_members` (owner / admin / analyst / member). Per-property staff
 * live in `property_members` with a property role.
 *
 * Effective property access = your account role (owner/admin get full access to
 * every property in the account, analyst gets read-only everywhere) OR an
 * explicit `property_members` row.
 *
 * IDENTITY: until a real auth provider is wired, the caller passes its email and
 * this is NOT a hard security boundary — a client could pass someone else's
 * address. `currentEmail` already prefers `ctx.auth.getUserIdentity()` when a
 * token is present, so wiring real auth later is a one-spot change.
 */

export type AccountRole = "owner" | "admin" | "analyst" | "member";
export type PropertyRole =
  | "gm"
  | "night_auditor"
  | "front_office"
  | "maintenance"
  | "housekeeping"
  | "read_only";

const ACCOUNT_RANK: Record<AccountRole, number> = {
  owner: 4,
  admin: 3,
  analyst: 2,
  member: 1,
};
const PROPERTY_RANK: Record<PropertyRole, number> = {
  gm: 5,
  night_auditor: 4,
  front_office: 3,
  maintenance: 2,
  housekeeping: 2,
  read_only: 1,
};

export interface Scope {
  email: string;
  accountId: Id<"accounts"> | null;
  accountRole: AccountRole | null;
  propertyId: Id<"properties"> | null;
  propertyRole: PropertyRole | null;
  /** owner/admin/analyst see every property in the account. */
  seesAllAccountProperties: boolean;
}

export async function currentEmail(
  ctx: QueryCtx,
  passedEmail?: string
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.email) return identity.email.toLowerCase();
  return passedEmail ? passedEmail.trim().toLowerCase() : null;
}

export async function resolveScope(
  ctx: QueryCtx,
  email: string,
  propertyId?: Id<"properties">
): Promise<Scope> {
  const accountMembership = (
    await ctx.db
      .query("account_members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()
  )[0];
  const accountId = accountMembership?.accountId ?? null;
  const accountRole = (accountMembership?.role as AccountRole | undefined) ?? null;
  const seesAll =
    accountRole === "owner" ||
    accountRole === "admin" ||
    accountRole === "analyst";

  let propertyRole: PropertyRole | null = null;
  if (propertyId) {
    const property = await ctx.db.get(propertyId);
    if (!property) throw new Error("Property not found");
    if (
      accountId &&
      property.accountId &&
      property.accountId !== accountId
    ) {
      throw new Error("Not authorized for this property");
    }
    if (accountRole === "owner" || accountRole === "admin") {
      propertyRole = "gm";
    } else if (accountRole === "analyst") {
      propertyRole = "read_only";
    } else {
      const pm = (
        await ctx.db
          .query("property_members")
          .withIndex("by_email", (q) => q.eq("email", email))
          .collect()
      ).find((m) => m.propertyId === propertyId);
      propertyRole = (pm?.role as PropertyRole | undefined) ?? null;
    }
  }

  return {
    email,
    accountId,
    accountRole,
    propertyId: propertyId ?? null,
    propertyRole,
    seesAllAccountProperties: seesAll,
  };
}

export async function authorize(
  ctx: QueryCtx,
  opts: {
    email?: string;
    propertyId?: Id<"properties">;
    requireAccount?: AccountRole;
    requireProperty?: PropertyRole;
  }
): Promise<Scope> {
  const email = await currentEmail(ctx, opts.email);
  if (!email) throw new Error("Not signed in");
  const scope = await resolveScope(ctx, email, opts.propertyId);

  if (opts.requireAccount) {
    if (
      !scope.accountRole ||
      ACCOUNT_RANK[scope.accountRole] < ACCOUNT_RANK[opts.requireAccount]
    ) {
      throw new Error(
        `This action needs account role “${opts.requireAccount}” or higher.`
      );
    }
  }
  if (opts.requireProperty) {
    if (
      !scope.propertyRole ||
      PROPERTY_RANK[scope.propertyRole] < PROPERTY_RANK[opts.requireProperty]
    ) {
      throw new Error(
        `This action needs property role “${opts.requireProperty}” or higher.`
      );
    }
  }
  return scope;
}

export async function writeAudit(
  ctx: MutationCtx,
  scope: Scope,
  action: string,
  opts: {
    propertyId?: Id<"properties">;
    target?: string;
    detail?: string;
  } = {}
): Promise<void> {
  if (!scope.accountId) return;
  await ctx.db.insert("audit_log", {
    accountId: scope.accountId,
    propertyId: opts.propertyId ?? scope.propertyId ?? undefined,
    actorEmail: scope.email,
    action,
    target: opts.target,
    detail: opts.detail,
    at: Date.now(),
  });
}
