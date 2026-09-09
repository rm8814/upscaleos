import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  properties: defineTable({
    name: v.string(),
    location: v.string(),
    id: v.string(), // External Property ID
    initials: v.string(),
    // Config — optional so a freshly created property can be fleshed out later.
    address: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    currency: v.optional(v.string()), // 'IDR'
    timezone: v.optional(v.string()), // 'Asia/Makassar'
    checkInTime: v.optional(v.string()), // '14:00'
    checkOutTime: v.optional(v.string()), // '12:00'
    businessDate: v.optional(v.string()), // PMS "today" — only advances on night audit
    status: v.optional(v.string()), // 'onboarding' | 'active' | 'archived' (absent = active/legacy)
    accountId: v.optional(v.id("accounts")), // the management company that owns this property
    // Operations settings
    autoAssignRooms: v.optional(v.boolean()), // pick a free room on reservation create
    autoNightAudit: v.optional(v.boolean()), // roll the business date on a schedule
    nightAuditTime: v.optional(v.string()), // 'HH:MM' in the property's timezone
    policies: v.optional(
      v.object({
        cancellation: v.string(),
        deposit: v.string(),
        children: v.string(),
        pets: v.string(),
        smoking: v.string(),
      })
    ),
  }).index("by_external_id", ["id"]),
  // `users` is provided by authTables (Convex Auth).
  property_members: defineTable({
    propertyId: v.id("properties"),
    accountId: v.optional(v.id("accounts")), // denormalized owner account
    email: v.string(),
    name: v.string(),
    role: v.string(), // 'gm' | 'front_office' | 'housekeeping' | 'night_auditor' | 'maintenance' | 'read_only'
    status: v.string(), // 'active' | 'invited'
  })
    .index("by_property", ["propertyId"])
    .index("by_email", ["email"])
    .index("by_account", ["accountId"]),

  // ---- tenancy: a management company (account) owns properties and users ----
  accounts: defineTable({
    name: v.string(),
    slug: v.string(),
    plan: v.string(), // 'trial' | 'standard' | 'enterprise'
    ownerEmail: v.string(),
  }).index("by_slug", ["slug"]),

  account_members: defineTable({
    accountId: v.id("accounts"),
    email: v.string(),
    name: v.string(),
    role: v.string(), // 'owner' | 'admin' | 'analyst' | 'member'
    status: v.string(), // 'active' | 'invited'
  })
    .index("by_account", ["accountId"])
    .index("by_email", ["email"]),

  audit_log: defineTable({
    accountId: v.id("accounts"),
    propertyId: v.optional(v.id("properties")),
    actorEmail: v.string(),
    action: v.string(), // 'property.create' | 'member.add' | 'member.role' | ...
    target: v.optional(v.string()),
    detail: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_account", ["accountId", "at"])
    .index("by_property", ["propertyId"]),
  taxes: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    rate: v.string(), // '11%' or 'Rp 20,000'
    basis: v.string(), // 'Room + F&B' | 'Per room-night' | ...
    inclusive: v.string(), // 'Inclusive' | 'Exclusive'
  }).index("by_property", ["propertyId"]),
  rooms: defineTable({
    propertyId: v.id("properties"),
    roomNumber: v.string(),
    status: v.string(), // 'Vacant Clean' | 'Vacant Dirty' | 'Occupied' | 'Inspected' | 'OOO' | 'OOS'
    type: v.string(), // e.g., 'King Suite', 'Double Queen'
    floor: v.optional(v.string()),
    attendant: v.optional(v.string()),
    updatedLabel: v.optional(v.string()), // e.g. '8m ago'
    priority: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  }).index("by_property", ["propertyId"]),
  maintenance_tickets: defineTable({
    title: v.string(),
    location: v.string(),
    priority: v.string(), // 'High' | 'Medium' | 'Low'
    assignee: v.string(),
    status: v.string(), // 'Open' | 'In progress' | 'Scheduled' | 'Resolved'
    created: v.string(),
    oooLinked: v.boolean(),
    cost: v.string(),
    propertyId: v.optional(v.id("properties")),
    slaText: v.optional(v.string()),
    ticketCode: v.optional(v.string()), // e.g. 'MT-1042'
  }).index("by_property", ["propertyId"]),
  guests: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    loyaltyTier: v.string(), // 'Silver', 'Gold', 'Platinum'
    preferences: v.optional(v.string()),
    marketingOptOut: v.optional(v.boolean()),
  }),
  reservations: defineTable({
    guestId: v.id("guests"),
    propertyId: v.id("properties"),
    roomId: v.optional(v.id("rooms")),
    checkIn: v.string(),
    checkOut: v.string(),
    status: v.string(), // 'tentative', 'confirmed', 'inhouse', 'departed', 'cancelled'
    rate: v.string(),
    totalAmount: v.string(),
    channel: v.optional(v.string()), // 'Direct' | 'Booking.com' | 'Agoda' | 'Expedia' | 'Traveloka'
    roomNumber: v.optional(v.string()),
    roomType: v.optional(v.string()),
    adults: v.optional(v.number()),
    children: v.optional(v.number()),
    etaLabel: v.optional(v.string()), // e.g. '14:20'
    roomAutoAssigned: v.optional(v.boolean()), // room was picked by auto-assign, not a person
    groupId: v.optional(v.id("group_blocks")), // part of a group block's rooming list
    externalRef: v.optional(v.string()), // channel/OTA booking reference, for idempotent ingest
  })
    .index("by_property", ["propertyId"])
    .index("by_group", ["groupId"])
    .index("by_external_ref", ["externalRef"]),
  folios: defineTable({
    propertyId: v.id("properties"),
    reservationId: v.id("reservations"),
    guestId: v.id("guests"),
    status: v.string(), // 'open' | 'closed'
    openedOn: v.string(), // business date it was opened
    closedOn: v.optional(v.string()),
  })
    .index("by_reservation", ["reservationId"])
    .index("by_property", ["propertyId"]),
  folio_lines: defineTable({
    folioId: v.id("folios"),
    propertyId: v.id("properties"),
    date: v.string(), // business date the line posted for
    kind: v.string(), // 'room' | 'tax' | 'service' | 'fnb' | 'payment' | 'adjustment'
    code: v.optional(v.string()), // transaction code (RM, TX-GOV, FB, PAY-CASH…)
    description: v.string(),
    amount: v.number(), // positive = charge, negative = payment / credit
    method: v.optional(v.string()), // payment method, for 'payment' lines
    source: v.optional(v.string()), // posting origin, e.g. a POS outlet name
    voided: v.optional(v.boolean()),
    postedAt: v.optional(v.number()), // wall-clock ms, for same-day ordering
  })
    .index("by_folio", ["folioId"])
    .index("by_property", ["propertyId"]),
  waitlist: defineTable({
    propertyId: v.id("properties"),
    guest: v.string(),
    roomType: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
    party: v.string(), // '2 adults, 1 child'
    source: v.string(), // 'Direct' | 'Phone' | 'Group inquiry'
  }).index("by_property", ["propertyId"]),
  expenses: defineTable({
    propertyId: v.id("properties"),
    category: v.string(), // 'Utilities', 'Payroll', 'Marketing', 'Maintenance'
    amount: v.string(),
    date: v.string(),
    description: v.string(),
  }).index("by_property", ["propertyId"]),
  corporate_agreements: defineTable({
    accountName: v.string(),
    type: v.string(),
    rate: v.string(),
    vsBar: v.string(),
    commission: v.string(),
    roomType: v.string(),
    contractStart: v.string(),
    contractEnd: v.string(),
    status: v.string(),
    propertyId: v.id("properties"),
    blackoutDates: v.optional(v.string()),
  }).index("by_property", ["propertyId"]),
  corporate_production: defineTable({
    agreementId: v.id("corporate_agreements"),
    year: v.string(),
    roomsBooked: v.number(),
    roomsContracted: v.number(),
  }).index("by_agreement", ["agreementId"]),
  group_blocks: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    status: v.string(), // 'Definite' | 'Tentative' | 'In-house'
    startDate: v.string(),
    nights: v.number(),
    cutoffDate: v.string(),
    contractLabel: v.string(), // 'Signed' | 'Awaiting signature'
    salesManager: v.string(),
    billing: v.string(),
    depositStatus: v.string(),
    depositAmount: v.string(),
    concessions: v.string(),
    contact: v.string(),
  }).index("by_property", ["propertyId"]),
  group_subblocks: defineTable({
    groupId: v.id("group_blocks"),
    propertyId: v.id("properties"),
    roomType: v.string(),
    blocked: v.number(),
    rate: v.string(),
  }).index("by_group", ["groupId"]),

  // ---- history: one immutable row per property per closed business date ----
  daily_stats: defineTable({
    propertyId: v.id("properties"),
    date: v.string(), // the business date that just closed
    roomsSold: v.number(), // occupied room-nights
    availableRooms: v.number(), // sellable rooms (not OOO/OOS) that night
    oooRooms: v.number(),
    roomRevenue: v.number(), // expected room revenue for the night
    postedRoomRevenue: v.number(), // room lines actually on folios for the night
    variance: v.number(), // roomRevenue - postedRoomRevenue
    balanced: v.boolean(), // variance === 0
    adr: v.number(),
    revpar: v.number(),
    occupancyPct: v.number(),
    arrivals: v.number(),
    departures: v.number(),
    closedAt: v.number(), // wall-clock ms the audit wrote this row
  })
    .index("by_property", ["propertyId", "date"])
    .index("by_date", ["date"]),

  // ---- pace / booking curve: rooms & revenue on the books as of a date ----
  pickup_snapshots: defineTable({
    propertyId: v.id("properties"),
    asOf: v.string(), // business date the snapshot was taken (post night audit)
    forDate: v.string(), // a future stay date
    roomsOnBooks: v.number(),
    revenueOnBooks: v.number(),
  })
    .index("by_property_asof", ["propertyId", "asOf"])
    .index("by_property_target", ["propertyId", "forDate", "asOf"]),
});
