"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProperty } from "@/components/providers/PropertyProvider";
import { AddPropertyButton } from "@/components/property/AddPropertyDialog";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, isLoading } = useAuth();
  const { properties, setProperties } = useProperty();
  const router = useRouter();

  // Persisted desktop icon-rail preference.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("upscale_sidebar_collapsed") === "1");
    } catch {
      /* private mode / blocked storage — default expanded */
    }
  }, []);

  const toggleCollapse = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("upscale_sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  // Guard: no authenticated session -> send to /login. Wait for the localStorage
  // session check to finish first so we don't bounce a valid session.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  // The properties this user manages. Feed them into the provider, which owns
  // the (persisted) active-property selection.
  const memberProperties = useQuery(
    api.properties.listForMember,
    user ? { email: user.email } : "skip"
  );

  useEffect(() => {
    if (memberProperties) setProperties(memberProperties);
  }, [memberProperties, setProperties]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink text-13 text-fg-3">
        {isLoading ? "Loading…" : "Redirecting to sign in…"}
      </div>
    );
  }

  if (memberProperties !== undefined && memberProperties.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <div className="font-display text-22 font-bold text-ice">No properties yet</div>
        <div className="max-w-sm text-13 text-fg-3">
          You don&rsquo;t manage any properties. Create one to get started.
        </div>
        <AddPropertyButton className="rounded-md bg-accent-violet px-4 py-2.5 text-13 font-semibold text-ice hover:bg-accent-violet-hi" />
      </div>
    );
  }

  if (memberProperties === undefined || properties.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink text-13 text-fg-3">
        Loading your properties…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink text-ice">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div
        className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-base ease-out ${
          collapsed ? "lg:pl-16" : "lg:pl-56"
        }`}
      >
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="upx-scroll flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

