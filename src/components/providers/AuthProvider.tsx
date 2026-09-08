"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  propertyId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, propertyId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate checking for a session in localStorage. Guard against a corrupt
    // or stale value so a bad blob can't crash the whole shell.
    try {
      const savedUser = localStorage.getItem("upscale_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as User;
        if (parsed && typeof parsed.email === "string" && parsed.propertyId) {
          setUser(parsed);
        } else {
          localStorage.removeItem("upscale_user");
        }
      }
    } catch {
      localStorage.removeItem("upscale_user");
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, propertyId: string) => {
    setIsLoading(true);
    // Simulate API call to auth provider
    await new Promise(resolve => setTimeout(resolve, 800));

    // Derive a display name from the address until a real auth provider gives us
    // a profile. Account role is resolved server-side from account_members.
    const local = email.split("@")[0] ?? email;
    const name = local
      .split(/[.\-_]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

    const mockUser: User = {
      id: `user_${local}`,
      name: name || email,
      email: email.trim().toLowerCase(),
      role: "member",
      propertyId: propertyId,
    };

    setUser(mockUser);
    localStorage.setItem("upscale_user", JSON.stringify(mockUser));
    setIsLoading(false);
    router.push("/");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("upscale_user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
