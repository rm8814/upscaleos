"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * The signed-in user's account, their account-level role, and the properties
 * they can open. `accountRole` is null for pure property staff.
 */
export function useAccount() {
  const { user } = useAuth();
  const data = useQuery(api.accounts.me, user ? {} : "skip");
  return {
    loading: data === undefined,
    email: data?.email ?? user?.email ?? null,
    account: data?.account ?? null,
    accountRole: data?.accountRole ?? null,
    properties: data?.properties ?? [],
    canOnboardProperties:
      data?.accountRole === "owner" || data?.accountRole === "admin",
    canManageAccount:
      data?.accountRole === "owner" || data?.accountRole === "admin",
  };
}
