import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  createAccount,
  modifyAccountCredentials,
  invalidateSessions,
} from "@convex-dev/auth/server";
import { currentEmail, resolveScope } from "./authz";
import type { Id } from "./_generated/dataModel";

const PASSWORD_PROVIDER = "password";
const RANK: Record<string, number> = { owner: 4, admin: 3, analyst: 2, member: 1 };

/* ------------------------------------------------------------ user directory */

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const email = await currentEmail(ctx);
    if (!email) return [];
    const scope = await resolveScope(ctx, email);
    if (!scope.accountId || (RANK[scope.accountRole ?? ""] ?? 0) < RANK.admin) {
      return [];
    }

    const [accMembers, propMembers, authAccts] = await Promise.all([
      ctx.db
        .query("account_members")
        .withIndex("by_account", (q) => q.eq("accountId", scope.accountId!))
        .collect(),
      ctx.db
        .query("property_members")
        .withIndex("by_account", (q) => q.eq("accountId", scope.accountId!))
        .collect(),
      ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", PASSWORD_PROVIDER)
        )
        .collect(),
    ]);
    const withLogin = new Set(authAccts.map((a) => a.providerAccountId));

    const rows = new Map<
      string,
      { email: string; name: string; roles: string[]; hasLogin: boolean }
    >();
    const add = (em: string, name: string, role: string) => {
      const key = em.toLowerCase();
      const r =
        rows.get(key) ?? { email: key, name, roles: [], hasLogin: withLogin.has(key) };
      if (name && (!r.name || r.name === key)) r.name = name;
      if (!r.roles.includes(role)) r.roles.push(role);
      rows.set(key, r);
    };
    for (const m of accMembers) add(m.email, m.name, `Account ${m.role}`);
    for (const m of propMembers) add(m.email, m.name, m.role);

    return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
  },
});

/* ---------------------------------------------- internal auth / lookup guards */

export const _canManage = internalQuery({
  args: { targetEmail: v.string() },
  handler: async (ctx, args) => {
    const email = await currentEmail(ctx);
    if (!email) return { ok: false as const, reason: "Not signed in" };
    const scope = await resolveScope(ctx, email);
    const role = scope.accountRole ?? "";
    if (!scope.accountId || (RANK[role] ?? 0) < RANK.admin) {
      return { ok: false as const, reason: "Requires account admin or higher" };
    }

    const target = args.targetEmail.trim().toLowerCase();

    // Target must be a member of the caller's account.
    const [accHit, propHit] = await Promise.all([
      ctx.db
        .query("account_members")
        .withIndex("by_email", (q) => q.eq("email", target))
        .collect(),
      ctx.db
        .query("property_members")
        .withIndex("by_email", (q) => q.eq("email", target))
        .collect(),
    ]);
    const targetAccRole = accHit.find(
      (m) => m.accountId === scope.accountId
    )?.role;
    const inAccount =
      !!targetAccRole ||
      propHit.some((m) => m.accountId === scope.accountId);
    if (!inAccount) {
      return { ok: false as const, reason: "That user is not in your account" };
    }

    // Only the owner may reset the owner's password.
    if (targetAccRole === "owner" && role !== "owner") {
      return {
        ok: false as const,
        reason: "Only the account owner can reset the owner's password",
      };
    }

    return {
      ok: true as const,
      accountId: scope.accountId as Id<"accounts">,
      actorEmail: email,
    };
  },
});

export const _loginInfo = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const acct = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q
          .eq("provider", PASSWORD_PROVIDER)
          .eq("providerAccountId", args.email.trim().toLowerCase())
      )
      .first();
    return { userId: acct?.userId ?? null };
  },
});

export const _audit = internalMutation({
  args: {
    accountId: v.id("accounts"),
    actorEmail: v.string(),
    targetEmail: v.string(),
    provisioned: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_log", {
      accountId: args.accountId,
      actorEmail: args.actorEmail,
      action: args.provisioned ? "user.login.provision" : "user.password.reset",
      target: args.targetEmail,
      at: Date.now(),
    });
  },
});

/* ------------------------------------------------------------- the action */

/**
 * Set (or provision) a user's sign-in password. Account owner / admin only.
 * If the user has no login yet, one is created; otherwise the password is
 * replaced and all their sessions are invalidated so they must sign in again.
 */
export const setUserPassword = action({
  args: { targetEmail: v.string(), newPassword: v.string() },
  handler: async (ctx, args): Promise<{ provisioned: boolean }> => {
    const target = args.targetEmail.trim().toLowerCase();
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const guard = await ctx.runQuery(internal.adminUsers._canManage, {
      targetEmail: target,
    });
    if (!guard.ok) throw new Error(guard.reason);

    const login = await ctx.runQuery(internal.adminUsers._loginInfo, {
      email: target,
    });

    let provisioned = false;
    if (login.userId) {
      await modifyAccountCredentials(ctx, {
        provider: PASSWORD_PROVIDER,
        account: { id: target, secret: args.newPassword },
      });
      await invalidateSessions(ctx, { userId: login.userId });
    } else {
      await createAccount(ctx, {
        provider: PASSWORD_PROVIDER,
        account: { id: target, secret: args.newPassword },
        profile: { email: target },
      });
      provisioned = true;
    }

    await ctx.runMutation(internal.adminUsers._audit, {
      accountId: guard.accountId,
      actorEmail: guard.actorEmail,
      targetEmail: target,
      provisioned,
    });
    return { provisioned };
  },
});
