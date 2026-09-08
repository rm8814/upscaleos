import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authorize, resolveScope, currentEmail, writeAudit } from "./authz";
import type { AccountRole } from "./authz";

const ACCOUNT_ROLES: AccountRole[] = ["owner", "admin", "analyst", "member"];

/**
 * The signed-in user's account, their role in it, and the properties they can
 * see. This is what the shell uses to decide the property switcher contents and
 * whether to show account-admin controls.
 */
export const me = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = await currentEmail(ctx, args.email);
    if (!email) return null;
    const scope = await resolveScope(ctx, email);

    const memberRows = await ctx.db
      .query("property_members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    // The account this user belongs to: their account membership, or failing
    // that the account that owns the properties they staff.
    let accountId = scope.accountId;
    if (!accountId && memberRows[0]) {
      const p = await ctx.db.get(memberRows[0].propertyId);
      accountId = p?.accountId ?? null;
    }

    if (!accountId) {
      return { email, account: null, accountRole: null, properties: [] };
    }
    const account = await ctx.db.get(accountId);
    const allInAccount = (await ctx.db.query("properties").collect()).filter(
      (p) => p.accountId === accountId
    );

    let visible = allInAccount;
    if (!scope.seesAllAccountProperties) {
      const mine = new Set(memberRows.map((m) => m.propertyId));
      visible = allInAccount.filter((p) => mine.has(p._id));
    }

    return {
      email,
      account: account
        ? { _id: account._id, name: account.name, slug: account.slug, plan: account.plan }
        : null,
      accountRole: scope.accountRole,
      properties: visible.sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
});

/** Account-level members (owner / admin / analyst / member). */
export const listMembers = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      email: args.email,
      requireAccount: "admin",
    });
    if (!scope.accountId) return [];
    return (
      await ctx.db
        .query("account_members")
        .withIndex("by_account", (q) => q.eq("accountId", scope.accountId!))
        .collect()
    ).sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const addMember = mutation({
  args: {
    email: v.optional(v.string()),
    memberEmail: v.string(),
    memberName: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      email: args.email,
      requireAccount: "admin",
    });
    if (!scope.accountId) throw new Error("No account");
    const role = ACCOUNT_ROLES.includes(args.role as AccountRole)
      ? args.role
      : "member";
    if (role === "owner")
      throw new Error("Transfer ownership from account settings, not by adding a member.");

    const lower = args.memberEmail.trim().toLowerCase();
    const dupe = (
      await ctx.db
        .query("account_members")
        .withIndex("by_account", (q) => q.eq("accountId", scope.accountId!))
        .collect()
    ).some((m) => m.email === lower);
    if (dupe) throw new Error("That email is already on the account.");

    await ctx.db.insert("account_members", {
      accountId: scope.accountId,
      email: lower,
      name: args.memberName.trim() || lower,
      role,
      status: "invited",
    });
    await writeAudit(ctx, scope, "account.member.add", {
      target: lower,
      detail: role,
    });
  },
});

export const updateMemberRole = mutation({
  args: { email: v.optional(v.string()), id: v.id("account_members"), role: v.string() },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      email: args.email,
      requireAccount: "admin",
    });
    const row = await ctx.db.get(args.id);
    if (!row || row.accountId !== scope.accountId) throw new Error("Not found");
    if (row.role === "owner")
      throw new Error("The owner's role can't be changed here.");
    const role = ACCOUNT_ROLES.includes(args.role as AccountRole)
      ? args.role
      : "member";
    if (role === "owner") throw new Error("Use transfer ownership instead.");
    await ctx.db.patch(args.id, { role });
    await writeAudit(ctx, scope, "account.member.role", {
      target: row.email,
      detail: role,
    });
  },
});

export const removeMember = mutation({
  args: { email: v.optional(v.string()), id: v.id("account_members") },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      email: args.email,
      requireAccount: "admin",
    });
    const row = await ctx.db.get(args.id);
    if (!row || row.accountId !== scope.accountId) throw new Error("Not found");
    if (row.role === "owner") throw new Error("The owner can't be removed.");
    await ctx.db.delete(args.id);
    await writeAudit(ctx, scope, "account.member.remove", { target: row.email });
  },
});

/** Recent account activity — property onboarding, member and role changes. */
export const auditLog = query({
  args: { email: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const scope = await authorize(ctx, {
      email: args.email,
      requireAccount: "admin",
    });
    if (!scope.accountId) return [];
    return await ctx.db
      .query("audit_log")
      .withIndex("by_account", (q) => q.eq("accountId", scope.accountId!))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 200));
  },
});
