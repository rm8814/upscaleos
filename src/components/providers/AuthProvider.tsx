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
    // Simulate checking for a session in localStorage
    const savedUser = localStorage.getItem("upscale_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, propertyId: string) => {
    setIsLoading(true);
    // Simulate API call to auth provider
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockUser: User = {
      id: "user_1",
      name: "Amira K.",
      email: email,
      role: "Admin",
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
