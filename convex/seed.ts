import { mutation } from "./_generated/server";

/**
 * Wipes and reseeds the demo property. Idempotent — safe to run repeatedly.
 * Dates are anchored to 2026-09-08 ("today" in the prototype) so the tape
 * chart and dashboard land on the current window.
 */

const TODAY = new Date("2026-09-08T00:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, n: number) => {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const ROOM_TYPES = ["Deluxe Twin", "Double Queen", "King Suite", "Presidential Suite"];
const HK_STATUSES = [
  "Inspected",
  "Vacant Clean",
  "Occupied",
  "Vacant Dirty",
  "OOO",
  "OOS",
];
const ATTENDANTS = ["Sri Wahyuni", "Dewi Lestari", "Putu Ayu", "Ni Made", "—"];

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // ---- wipe --------------------------------------------------------------
    for (const table of [
      "waitlist",
      "reservations",
      "rooms",
      "maintenance_tickets",
      "guests",
      "expenses",
      "corporate_production",
      "corporate_agreements",
      "taxes",
      "property_members",
      "users",
      "properties",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    }

    // ---- property + user + members ------------------------------------
    const propertyId = await ctx.db.insert("properties", {
      name: "Grand Samudra Bali",
      location: "Seminyak, Bali",
      id: "04812",
      initials: "GSB",
      address: "Jl. Kayu Aya No. 88, Seminyak, Badung, Bali 80361",
      contactEmail: "reservations@grandsamudra.upscale.id",
      currency: "IDR",
      timezone: "Asia/Makassar",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      businessDate: "2026-09-08",
      status: "active",
      autoAssignRooms: true,
      autoNightAudit: true,
      nightAuditTime: "03:00",
      policies: {
        cancellation: "Free cancellation up to 48h before arrival.",
        deposit: "Card guarantee, no prepayment.",
        children: "Under 6 stay free with an adult.",
        pets: "Not permitted.",
        smoking: "Designated areas only.",
      },
    });

    await ctx.db.insert("users", {
      name: "Amira K.",
      email: "gm@grandsamudra.upscale.id",
      role: "Admin",
      propertyId,
    });

    const members = [
      { email: "gm@grandsamudra.upscale.id", name: "Amira K.", role: "General Manager", status: "active" },
      { email: "fo@grandsamudra.upscale.id", name: "Rangga Putra", role: "Front office", status: "active" },
      { email: "hk@grandsamudra.upscale.id", name: "Wayan Sari", role: "Housekeeping lead", status: "active" },
      { email: "eng@grandsamudra.upscale.id", name: "Budi Santoso", role: "Engineering", status: "active" },
      { email: "night@grandsamudra.upscale.id", name: "Sri Wahyuni", role: "Night auditor", status: "invited" },
    ];
    for (const m of members) {
      await ctx.db.insert("property_members", { ...m, propertyId });
    }

    const taxes = [
      { name: "Government tax", rate: "11%", basis: "Room + F&B", inclusive: "Exclusive" },
      { name: "Service charge", rate: "10%", basis: "Room + F&B", inclusive: "Exclusive" },
      { name: "City / tourism levy", rate: "Rp 20,000", basis: "Per room-night", inclusive: "Exclusive" },
    ];
    for (const t of taxes) {
      await ctx.db.insert("taxes", { ...t, propertyId });
    }

    // ---- rooms: 5 floors × 6 rooms = 30 --------------------------------
    const roomRows: {
      _id: import("./_generated/dataModel").Id<"rooms">;
      roomNumber: string;
      type: string;
      status: string;
    }[] = [];

    let seq = 0;
    for (let floor = 1; floor <= 5; floor++) {
      for (let n = 1; n <= 6; n++) {
        const roomNumber = `${floor}${n.toString().padStart(2, "0")}`;
        const type =
          floor === 5
            ? "Presidential Suite"
            : ROOM_TYPES[(floor + n) % 3];
        const status = HK_STATUSES[seq % HK_STATUSES.length];
        seq++;
        const attendant =
          status === "OOO" || status === "OOS"
            ? "—"
            : ATTENDANTS[seq % (ATTENDANTS.length - 1)];
        const _id = await ctx.db.insert("rooms", {
          propertyId,
          roomNumber,
          type,
          status,
          floor: `Floor ${floor}`,
          attendant,
          updatedLabel: `${(seq * 7) % 55 + 3}m ago`,
          priority: status === "Vacant Dirty" && n === 2,
          notes: undefined,
        });
        roomRows.push({ _id, roomNumber, type, status });
      }
    }

    // ---- maintenance tickets -----------------------------------------
    const tickets = [
      {
        ticketCode: "MT-1042",
        title: "AC not cooling",
        location: "Room 204",
        priority: "High",
        assignee: "Budi (in-house)",
        status: "In progress",
        created: iso(addDays(TODAY, -1)),
        oooLinked: true,
        cost: "1,850,000",
        slaText: "2h left",
      },
      {
        ticketCode: "MT-1041",
        title: "Leaking shower valve",
        location: "Room 312",
        priority: "Medium",
        assignee: "PT Sanitasi Jaya",
        status: "Scheduled",
        created: iso(addDays(TODAY, -2)),
        oooLinked: false,
        cost: "640,000",
        slaText: "Tomorrow",
      },
      {
        ticketCode: "MT-1040",
        title: "Broken safe keypad",
        location: "Room 118",
        priority: "Low",
        assignee: "Budi (in-house)",
        status: "Open",
        created: iso(addDays(TODAY, -3)),
        oooLinked: false,
        cost: "0",
        slaText: "3d left",
      },
      {
        ticketCode: "MT-1039",
        title: "Pool pump noise",
        location: "Pool deck",
        priority: "Medium",
        assignee: "PT Kolam Sehat",
        status: "In progress",
        created: iso(addDays(TODAY, -4)),
        oooLinked: false,
        cost: "2,100,000",
        slaText: "Overdue",
      },
      {
        ticketCode: "MT-1038",
        title: "Lobby lamp flicker",
        location: "Lobby",
        priority: "Low",
        assignee: "Budi (in-house)",
        status: "Resolved",
        created: iso(addDays(TODAY, -8)),
        oooLinked: false,
        cost: "180,000",
        slaText: "Done",
      },
    ];
    for (const t of tickets) {
      await ctx.db.insert("maintenance_tickets", { ...t, propertyId });
    }

    // ---- guests + reservations --------------------------------------
    const guestNames = [
      "Andi Pratama",
      "Sarah Wijaya",
      "Michael Chen",
      "Kadek Surya",
      "Emma Thompson",
      "Rizky Hidayat",
      "Olivia Martin",
      "Hendra Gunawan",
      "Sophie Laurent",
      "Bagus Permana",
      "Yuki Tanaka",
      "Nadia Rahman",
      "Daniel Kim",
      "Putri Anggraini",
    ];
    const tiers = ["Silver", "Gold", "Platinum"];
    const channels = ["Direct", "Booking.com", "Agoda", "Expedia", "Traveloka"];
    const resStatuses = ["inhouse", "confirmed", "tentative", "departed"];

    const guestIds = await Promise.all(
      guestNames.map((name, i) =>
        ctx.db.insert("guests", {
          name,
          email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
          phone: `+62 81${(200000000 + i * 137731).toString().slice(0, 9)}`,
          loyaltyTier: tiers[i % tiers.length],
          preferences: i % 3 === 0 ? "High floor, quiet room" : undefined,
          marketingOptOut: i % 4 === 0,
        })
      )
    );

    const nightlyByType: Record<string, string> = {
      "Deluxe Twin": "Rp 1,450,000",
      "Double Queen": "Rp 1,850,000",
      "King Suite": "Rp 2,600,000",
      "Presidential Suite": "Rp 6,900,000",
    };

    for (let i = 0; i < guestIds.length; i++) {
      const room = roomRows[(i * 3) % roomRows.length];
      const startOffset = (i % 7) - 3; // -3 .. +3 days from today
      const nights = 1 + (i % 4);
      const checkIn = addDays(TODAY, startOffset);
      const checkOut = addDays(checkIn, nights);
      const status =
        startOffset < -1
          ? "departed"
          : startOffset <= 0
            ? "inhouse"
            : resStatuses[i % resStatuses.length];
      const rate = nightlyByType[room.type] ?? "Rp 1,850,000";
      const rupiah = Number(rate.replace(/[^\d]/g, ""));
      await ctx.db.insert("reservations", {
        guestId: guestIds[i],
        propertyId,
        roomId: room._id,
        checkIn: iso(checkIn),
        checkOut: iso(checkOut),
        status,
        rate,
        totalAmount: `Rp ${(rupiah * nights).toLocaleString("en-US")}`,
        channel: channels[i % channels.length],
        roomNumber: room.roomNumber,
        roomType: room.type,
        adults: 1 + (i % 3),
        children: i % 4 === 0 ? 1 : 0,
        etaLabel: status === "confirmed" ? `${12 + (i % 8)}:${(i * 13) % 60 < 10 ? "0" : ""}${(i * 13) % 60}` : undefined,
      });
    }

    // ---- expenses (finance milestone) ------------------------------
    const expenses = [
      { category: "Payroll", amount: "Rp 82,000,000", date: iso(addDays(TODAY, -6)), description: "Staff salaries — September" },
      { category: "Utilities", amount: "Rp 12,400,000", date: iso(addDays(TODAY, -5)), description: "PLN electricity + water" },
      { category: "Maintenance", amount: "Rp 5,100,000", date: iso(addDays(TODAY, -3)), description: "AC repair — Room 204" },
      { category: "Marketing", amount: "Rp 9,800,000", date: iso(addDays(TODAY, -2)), description: "OTA commission — Expedia" },
    ];
    for (const e of expenses) await ctx.db.insert("expenses", { ...e, propertyId });

    // ---- waitlist (unassigned requests on the tape chart) -----------
    const waitlist = [
      { guest: "Anjali Menon", roomType: "King Suite", checkIn: iso(addDays(TODAY, 2)), checkOut: iso(addDays(TODAY, 5)), party: "2 adults", source: "Phone" },
      { guest: "Grup Astra (12 kamar)", roomType: "Double Queen", checkIn: iso(addDays(TODAY, 6)), checkOut: iso(addDays(TODAY, 9)), party: "Group inquiry", source: "Group inquiry" },
    ];
    for (const w of waitlist) {
      await ctx.db.insert("waitlist", { ...w, propertyId });
    }

    // ---- corporate agreements (grow milestone) -------------------
    const corporates = [
      { accountName: "Accor Global", type: "Corporate", rate: "Rp 1,800,000", vsBar: "−20%", commission: "10%", roomType: "King Suite", contractStart: "2026-01-01", contractEnd: "2026-12-31", status: "Active", blackoutDates: "Dec 24–31" },
      { accountName: "La Compagnie", type: "Corporate", rate: "Rp 2,100,000", vsBar: "−15%", commission: "8%", roomType: "Double Queen", contractStart: "2026-03-15", contractEnd: "2027-03-14", status: "Active", blackoutDates: "Aug 10–15" },
      { accountName: "TechCorp Inc", type: "Travel Agent", rate: "Rp 1,600,000", vsBar: "−25%", commission: "12%", roomType: "King Suite", contractStart: "2026-06-01", contractEnd: "2026-12-31", status: "Expired", blackoutDates: "None" },
    ];
    const corpIds = await Promise.all(
      corporates.map((c) => ctx.db.insert("corporate_agreements", { ...c, propertyId }))
    );
    const productions = [
      { agreementId: corpIds[0], year: "2026", roomsBooked: 850, roomsContracted: 1000 },
      { agreementId: corpIds[1], year: "2026", roomsBooked: 420, roomsContracted: 500 },
      { agreementId: corpIds[2], year: "2026", roomsBooked: 110, roomsContracted: 300 },
    ];
    for (const p of productions) await ctx.db.insert("corporate_production", p);

    return { success: true, rooms: roomRows.length, reservations: guestIds.length };
  },
});
