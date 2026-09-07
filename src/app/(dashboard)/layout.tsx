"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/components/providers/AuthProvider";
import { useProperty } from "@/components/providers/PropertyProvider";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const { activeProperty, setActiveProperty } = useProperty();
  const router = useRouter();

  // Guard: no authenticated session -> send to /login. Wait for the localStorage
  // session check to finish first so we don't bounce a valid session.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  // Resolve the real Convex property from the external ID the user signed in with.
  // Fall back to the first property so the prototype still works if the ID doesn't match.
  const propertyByExternalId = useQuery(
    api.properties.getByExternalId,
    user ? { externalId: user.propertyId } : "skip"
  );
  const firstProperty = useQuery(api.properties.getFirst, user ? {} : "skip");
  const resolvedProperty = propertyByExternalId ?? firstProperty;

  useEffect(() => {
    if (resolvedProperty && !activeProperty) {
      setActiveProperty({
        _id: resolvedProperty._id,
        name: resolvedProperty.name,
        location: resolvedProperty.location,
        id: resolvedProperty.id,
        initials: resolvedProperty.initials,
      });
    }
  }, [resolvedProperty, activeProperty, setActiveProperty]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink text-13 text-fg-3">
        {isLoading ? "Loading…" : "Redirecting to sign in…"}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink text-ice">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-56">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="upx-scroll flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

