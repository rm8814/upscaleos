"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  /** Password sign-in / sign-up. `flow` defaults to "signIn". */
  authenticate: (
    email: string,
    password: string,
    flow?: "signIn" | "signUp",
    name?: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  const me = useQuery(api.auth.me, isAuthenticated ? {} : "skip");

  const user: User | null =
    isAuthenticated && me
      ? {
          id: me.id,
          email: me.email ?? "",
          name:
            me.name ||
            (me.email
              ? me.email
                  .split("@")[0]
                  .split(/[.\-_]+/)
                  .filter(Boolean)
                  .map((w) => w[0].toUpperCase() + w.slice(1))
                  .join(" ")
              : "—"),
        }
      : null;

  const isLoading = authLoading || (isAuthenticated && me === undefined);

  const authenticate = useCallback(
    async (
      email: string,
      password: string,
      flow: "signIn" | "signUp" = "signIn",
      name?: string
    ) => {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow,
        ...(flow === "signUp" && name ? { name } : {}),
      });
      router.push("/");
    },
    [signIn, router]
  );

  const logout = useCallback(() => {
    void signOut().then(() => router.push("/login"));
  }, [signOut, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
