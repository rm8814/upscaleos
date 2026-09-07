import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  properties: defineTable({
    name: v.string(),
    location: v.string(),
    id: v.string(), // External Property ID
    initials: v.string(),
  }).index("by_external_id", ["id"]),
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(), // e.g., 'Admin', 'Manager', 'Staff'
    propertyId: v.id("properties"),
  }).index("by_email", ["email"]),
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
});
