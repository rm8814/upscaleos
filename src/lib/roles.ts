// Role vocab shared by the access-control UI. Keys match convex/authz.ts.

export const PROPERTY_ROLES = [
  "gm",
  "front_office",
  "night_auditor",
  "housekeeping",
  "maintenance",
  "read_only",
] as const;
export type PropertyRole = (typeof PROPERTY_ROLES)[number];

export const PROPERTY_ROLE_LABEL: Record<PropertyRole, string> = {
  gm: "General manager",
  front_office: "Front office",
  night_auditor: "Night auditor",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  read_only: "Read only",
};

export const ACCOUNT_ROLES = ["owner", "admin", "analyst", "member"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const ACCOUNT_ROLE_LABEL: Record<AccountRole, string> = {
  owner: "Owner",
  admin: "Admin",
  analyst: "Analyst",
  member: "Member",
};

export const ACCOUNT_ROLE_HINT: Record<AccountRole, string> = {
  owner: "Full access, billing, ownership transfer",
  admin: "Onboard properties, manage members, all properties",
  analyst: "Read-only across every property",
  member: "Only properties they are explicitly assigned",
};

export const roleLabel = (r: string): string =>
  (PROPERTY_ROLE_LABEL as Record<string, string>)[r] ??
  (ACCOUNT_ROLE_LABEL as Record<string, string>)[r] ??
  r;
