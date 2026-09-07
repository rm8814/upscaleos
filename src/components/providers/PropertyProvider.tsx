"use client";

import React, { createContext, useContext, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface Property {
  _id: Id<"properties">;
  name: string;
  location: string;
  id: string;
  initials: string;
}

interface PropertyContextType {
  activeProperty: Property | null;
  setActiveProperty: (property: Property) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);

  return (
    <PropertyContext.Provider value={{ activeProperty, setActiveProperty }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error("useProperty must be used within a PropertyProvider");
  }
  return context;
}
