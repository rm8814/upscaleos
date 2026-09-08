"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "./AuthProvider";
import { useProperty } from "./PropertyProvider";

/**
 * The signed-in user's `property_members` row for the active property — the
 * single source of truth for their role and access. Returns `undefined` while
 * loading, `null` when the user isn't a member of this property.
 */
export function useCurrentMember() {
  const { user } = useAuth();
  const { activeProperty } = useProperty();
  return useQuery(
    api.team.currentMember,
    user && activeProperty
      ? { propertyId: activeProperty._id, email: user.email }
      : "skip"
  );
}

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
