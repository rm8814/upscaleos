"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export type Property = Doc<"properties">;

const STORAGE_KEY = "upscale_active_property";

interface PropertyContextType {
  properties: Property[];
  activeProperty: Property | null;
  activePropertyId: Id<"properties"> | null;
  /** Set by the dashboard layout from the Convex membership query. */
  setProperties: (props: Property[]) => void;
  /** Switch the active property (persisted). */
  setActivePropertyId: (id: Id<"properties">) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const [properties, setPropertiesState] = useState<Property[]>([]);
  const [activePropertyId, setActivePropertyIdState] =
    useState<Id<"properties"> | null>(null);

  // Restore the last-selected property id.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setActivePropertyIdState(saved as Id<"properties">);
    } catch {
      /* private mode — ignore */
    }
  }, []);

  const setActivePropertyId = useCallback((id: Id<"properties">) => {
    setActivePropertyIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const setProperties = useCallback((props: Property[]) => {
    setPropertiesState(props);
    // If the saved id isn't in the list any more, fall back to the first.
    setActivePropertyIdState((current) => {
      if (current && props.some((p) => p._id === current)) return current;
      return props[0]?._id ?? null;
    });
  }, []);

  const activeProperty = useMemo(
    () =>
      properties.find((p) => p._id === activePropertyId) ?? properties[0] ?? null,
    [properties, activePropertyId]
  );

  const value = useMemo(
    () => ({
      properties,
      activeProperty,
      activePropertyId: activeProperty?._id ?? null,
      setProperties,
      setActivePropertyId,
    }),
    [properties, activeProperty, setProperties, setActivePropertyId]
  );

  return (
    <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error("useProperty must be used within a PropertyProvider");
  }
  return context;
}
