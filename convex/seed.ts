import { internalMutation } from "./_generated/server";
import { issueInvoiceForFolio } from "./invoices";
import { postNight } from "./folios";

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

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // ---- wipe --------------------------------------------------------------
    for (const table of [
      "folio_lines",
      "folios",
      "group_subblocks",
      "group_blocks",
      "daily_stats",
      "pickup_snapshots",
      "invoices",
      "invoice_counters",
      "ar_transactions",
      "ar_accounts",
      "rate_adjustments",
      "rate_overrides",
      "rate_plans",
      "channel_terms",
      "room_blocks",
      "waitlist",
      "reservations",
      "rooms",
      "maintenance_tickets",
      "guests",
      "expenses",
      "corporate_production",
      "corporate_agreements",
      "taxes",
      "audit_log",
      "property_members",
      "account_members",
      "accounts",
      "properties",
      // NOTE: `users` (Convex Auth identities) is deliberately not wiped, so a
      // signed-up demo login survives a reseed. Membership rows are keyed by
      // email and re-link on the next sign-in.
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    }

    // ---- account (the management company) ----------------------------
    const OWNER_EMAIL = "anin@upscale.asia";
    const accountId = await ctx.db.insert("accounts", {
      name: "UPSCALE Management",
      slug: "upscale-management",
      plan: "enterprise",
      ownerEmail: OWNER_EMAIL,
    });
    const accountMembers = [
      { email: OWNER_EMAIL, name: "Anin", role: "owner", status: "active" },
      { email: "ops@upscale.asia", name: "Regional Ops", role: "admin", status: "active" },
      { email: "analyst@upscale.asia", name: "Revenue Analyst", role: "analyst", status: "active" },
    ];
    for (const m of accountMembers) {
      await ctx.db.insert("account_members", { ...m, accountId });
    }

    // ---- property + members -----------------------------------------
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
      accountId,
      autoAssignRooms: false, // demo starts with two roomless bookings intact
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

    // A second property the company is mid-onboarding — demonstrates the
    // account owner seeing every property without a per-property role.
    await ctx.db.insert("properties", {
      name: "Samudra Ubud Retreat",
      location: "Ubud, Bali",
      id: "04813",
      initials: "SUR",
      address: "Jl. Raya Sanggingan, Ubud, Gianyar, Bali 80571",
      contactEmail: "hello@samudraubud.upscale.id",
      currency: "IDR",
      timezone: "Asia/Makassar",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      status: "onboarding",
      accountId,
    });

    const members = [
      { email: "gm@grandsamudra.upscale.id", name: "Amira K.", role: "gm", status: "active" },
      { email: "fo@grandsamudra.upscale.id", name: "Rangga Putra", role: "front_office", status: "active" },
      { email: "hk@grandsamudra.upscale.id", name: "Wayan Sari", role: "housekeeping", status: "active" },
      { email: "eng@grandsamudra.upscale.id", name: "Budi Santoso", role: "maintenance", status: "active" },
      { email: "night@grandsamudra.upscale.id", name: "Sri Wahyuni", role: "night_auditor", status: "invited" },
    ];
    for (const m of members) {
      await ctx.db.insert("property_members", { ...m, accountId, propertyId });
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
    const ticketIds: Record<string, import("./_generated/dataModel").Id<"maintenance_tickets">> = {};
    for (const t of tickets) {
      ticketIds[t.ticketCode] = await ctx.db.insert("maintenance_tickets", {
        ...t,
        propertyId,
      });
    }

    // ---- room blocks: give the seeded OOO/OOS rooms a reason + dates ----
    const BLOCK_REASONS = [
      { reason: "Bathroom re-grout", days: 4, ticket: "MT-1041" },
      { reason: "Deep clean after water leak", days: 2 },
      { reason: "Carpet replacement", days: 6 },
      { reason: "Balcony rail repair", days: 3, ticket: "MT-1042" },
      { reason: "Aircon compressor swap", days: 5 },
      { reason: "Full refurbishment", days: 20 },
    ];
    let bi = 0;
    for (const r of roomRows) {
      if (r.status !== "OOO" && r.status !== "OOS") continue;
      const spec = BLOCK_REASONS[bi % BLOCK_REASONS.length];
      bi++;
      await ctx.db.insert("room_blocks", {
        propertyId,
        roomId: r._id,
        kind: r.status,
        from: iso(addDays(TODAY, -1)),
        // OOO has no known end — maintenance clears it when the work is done.
        to: r.status === "OOO" ? "" : iso(addDays(TODAY, spec.days)),
        reason: spec.reason,
        ticketId: spec.ticket ? ticketIds[spec.ticket] : undefined,
        createdBy: "eng@grandsamudra.upscale.id",
      });
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

    const sellableRoomRows = roomRows.filter(
      (r) => r.status !== "OOO" && r.status !== "OOS"
    );

    for (let i = 0; i < guestIds.length; i++) {
      // i*7 mod N hits distinct rooms — no two seed guests share one — and
      // we only place them in sellable rooms (never an OOO/OOS one).
      const room = sellableRoomRows[(i * 7) % sellableRoomRows.length];
      const startOffset = (i % 7) - 3; // -3 .. +3 days from today
      const nights = 1 + (i % 4);
      const checkIn = addDays(TODAY, startOffset);
      const status =
        startOffset < -1
          ? "departed"
          : startOffset <= 0
            ? "inhouse"
            : resStatuses[i % resStatuses.length];
      // A departed reservation must have already checked out — clamp to today.
      const rawCheckOut = addDays(checkIn, nights);
      const checkOut =
        status === "departed" && rawCheckOut > TODAY ? TODAY : rawCheckOut;
      const rate = nightlyByType[room.type] ?? "Rp 1,850,000";
      const rupiah = Number(rate.replace(/[^\d]/g, ""));
      // A couple of upcoming bookings arrived without a room assigned.
      const roomless = i === 5 || i === 13;
      const resId = await ctx.db.insert("reservations", {
        guestId: guestIds[i],
        propertyId,
        roomId: roomless ? undefined : room._id,
        checkIn: iso(checkIn),
        checkOut: iso(checkOut),
        status,
        rate,
        totalAmount: `Rp ${(rupiah * nights).toLocaleString("en-US")}`,
        channel: channels[i % channels.length],
        roomNumber: roomless ? undefined : room.roomNumber,
        roomType: room.type,
        adults: 1 + (i % 3),
        children: i % 4 === 0 ? 1 : 0,
        // a few upcoming bookings came in via OTA and were auto-roomed
        roomAutoAssigned:
          !roomless && (status === "confirmed" || status === "tentative") && i % 2 === 0,
        etaLabel: status === "confirmed" ? `${12 + (i % 8)}:${(i * 13) % 60 < 10 ? "0" : ""}${(i * 13) % 60}` : undefined,
      });

      void resId;
    }

    // ---- forward booking pace ----------------------------------
    //   Fill the next 20 stay dates so the dashboard outlook, reports pace
    //   / forecast and the pickup curve show a realistic tapering shape
    //   instead of collapsing to zero a week out.
    const sellableForPace = roomRows.filter(
      (r) => r.status !== "OOO" && r.status !== "OOS"
    );
    const usedByDate = new Map<string, Set<string>>();
    // pre-load the rooms already committed by the bookings above
    for (
      let k = 0;
      k <= 24;
      k++
    ) {
      const d = iso(addDays(TODAY, k));
      usedByDate.set(d, new Set());
    }
    // Per-type sellable capacity, and a running per-type / per-night tally so
    // the pace fill never pushes a room type past its own inventory.
    const capByType = new Map<string, number>();
    for (const r of sellableForPace)
      capByType.set(r.type, (capByType.get(r.type) ?? 0) + 1);
    const usedTypeByDate = new Map<string, Map<string, number>>();
    const bumpType = (d: string, type: string, by = 1) => {
      if (!usedTypeByDate.has(d)) usedTypeByDate.set(d, new Map());
      const m = usedTypeByDate.get(d)!;
      m.set(type, (m.get(type) ?? 0) + by);
    };

    const existingRes = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    for (const r of existingRes) {
      if (!r.roomId) continue;
      for (let d = r.checkIn; d < r.checkOut; d = iso(addDays(new Date(d + "T00:00:00Z"), 1))) {
        usedByDate.get(d)?.add(r.roomId);
        if (r.roomType) bumpType(d, r.roomType);
      }
    }

    let paceGuest = 0;
    for (let k = 1; k <= 20; k++) {
      const arrDate = addDays(TODAY, k);
      const arrIso = iso(arrDate);
      const targetOcc = Math.max(0.3, 0.72 - k * 0.02);
      const target = Math.round(sellableForPace.length * targetOcc);
      const covered = [...usedByDate.get(arrIso)!].length;
      let toAdd = target - covered;
      for (const room of sellableForPace) {
        if (toAdd <= 0) break;
        if (usedByDate.get(arrIso)!.has(room._id)) continue;
        // leave one room per type free on every night for groups / walk-ins
        const typeCeil = (capByType.get(room.type) ?? 0) - 1;
        const nights = 1 + ((k + paceGuest) % 3);
        // don't create a stay that runs past our tracked window / collides /
        // tips a room type over its inventory.
        let ok = true;
        for (let n = 0; n < nights; n++) {
          const nd = iso(addDays(arrDate, n));
          if (
            !usedByDate.has(nd) ||
            usedByDate.get(nd)!.has(room._id) ||
            (usedTypeByDate.get(nd)?.get(room.type) ?? 0) >= typeCeil
          ) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const checkOutIso = iso(addDays(arrDate, nights));
        const rate = nightlyByType[room.type] ?? "Rp 1,850,000";
        const rupiah = Number(rate.replace(/[^\d]/g, ""));
        const status = k <= 6 ? "confirmed" : paceGuest % 3 === 0 ? "tentative" : "confirmed";
        await ctx.db.insert("reservations", {
          guestId: guestIds[paceGuest % guestIds.length],
          propertyId,
          roomId: room._id,
          checkIn: arrIso,
          checkOut: checkOutIso,
          status,
          rate,
          totalAmount: `Rp ${(rupiah * nights).toLocaleString("en-US")}`,
          channel: channels[paceGuest % channels.length],
          roomNumber: room.roomNumber,
          roomType: room.type,
          adults: 1 + (paceGuest % 3),
          children: paceGuest % 5 === 0 ? 1 : 0,
        });
        for (let n = 0; n < nights; n++) {
          const nd = iso(addDays(arrDate, n));
          usedByDate.get(nd)!.add(room._id);
          bumpType(nd, room.type);
        }
        toAdd -= 1;
        paceGuest += 1;
      }
    }

    // ---- corporate agreements + negotiated-rate tagging ----------
    // (before the folio pass, so tagged folios post at the negotiated rate)
    const corporates = [
      { accountName: "Accor Global", type: "Corporate", rate: "Rp 1,800,000", vsBar: "−20%", commission: "10%", roomType: "King Suite", contractStart: "2026-01-01", contractEnd: "2026-12-31", status: "Active", blackoutDates: "Dec 24–31", roomsContracted: 1000 },
      { accountName: "La Compagnie", type: "Corporate", rate: "Rp 2,100,000", vsBar: "−15%", commission: "8%", roomType: "Double Queen", contractStart: "2026-03-15", contractEnd: "2027-03-14", status: "Active", blackoutDates: "Aug 10–15", roomsContracted: 500 },
      { accountName: "TechCorp Inc", type: "Travel Agent", rate: "Rp 1,600,000", vsBar: "−25%", commission: "12%", roomType: "King Suite", contractStart: "2026-03-01", contractEnd: "2026-08-31", status: "Expired", blackoutDates: "None", roomsContracted: 300 },
    ];
    const corpIds = await Promise.all(
      corporates.map((c) =>
        ctx.db.insert("corporate_agreements", { ...c, propertyId })
      )
    );
    const kingBookings = (
      await ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .collect()
    ).filter(
      (r) =>
        r.roomType === "King Suite" &&
        (r.status === "inhouse" || r.status === "confirmed") &&
        r.checkIn <= iso(addDays(TODAY, 4)) // near-term stays only
    );
    // ---- distribution channel terms (OTA commission) ------------
    const channelTerms = [
      { channel: "Booking.com", commissionPct: 0.15, collection: "merchant" },
      { channel: "Agoda", commissionPct: 0.18, collection: "merchant" },
      { channel: "Expedia", commissionPct: 0.17, collection: "hotel" },
      { channel: "Traveloka", commissionPct: 0.12, collection: "merchant" },
    ];
    for (const c of channelTerms) {
      await ctx.db.insert("channel_terms", { ...c, propertyId, active: true });
    }

    // ---- rate plans (first-class, sellable price definitions) ----
    const planSeed = [
      { code: "BAR", name: "Best Available Rate", kind: "bar", pricing: "engine", active: true },
      { code: "CORP-ACCOR", name: "Accor Global negotiated", kind: "corporate", pricing: "flat", agreementId: corpIds[0], amount: 1800000, active: true },
      { code: "PKG-BB", name: "Bed & Breakfast", kind: "package", pricing: "engine", includesBreakfast: true, components: [{ label: "Breakfast for 2", amount: 150000, code: "FB-BF" }], active: true },
      { code: "PROMO-EB21", name: "Early Bird — 21 days", kind: "promo", pricing: "percent_off", percent: 0.15, advanceDays: 21, minLos: 2, active: true },
      { code: "PROMO-STAY3", name: "Stay 3 Pay 2", kind: "promo", pricing: "amount_off", amount: 500000, minLos: 3, active: false },
    ];
    const planIds: Record<string, import("./_generated/dataModel").Id<"rate_plans">> = {};
    for (const p of planSeed) {
      planIds[p.code] = await ctx.db.insert("rate_plans", { ...p, propertyId });
    }

    for (const r of kingBookings.slice(0, 3)) {
      await ctx.db.patch(r._id, {
        corporateAccountId: corpIds[0],
        ratePlanId: planIds["CORP-ACCOR"],
      });
    }
    // put a couple of upcoming direct bookings on the early-bird promo
    const ebCandidates = (
      await ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .collect()
    ).filter((r) => {
      if (r.status !== "confirmed" && r.status !== "tentative") return false;
      if (r.corporateAccountId) return false;
      const nights = Math.round(
        (Date.parse(r.checkOut + "T00:00:00Z") -
          Date.parse(r.checkIn + "T00:00:00Z")) /
          86400000
      );
      const lead = Math.round(
        (Date.parse(r.checkIn + "T00:00:00Z") -
          Date.parse(iso(TODAY) + "T00:00:00Z")) /
          86400000
      );
      // PROMO-EB21 conditions: 2+ nights, booked 21+ days out
      return nights >= 2 && lead >= 21;
    });
    for (const r of ebCandidates.slice(0, 2)) {
      await ctx.db.patch(r._id, { ratePlanId: planIds["PROMO-EB21"] });
    }
    // one in-house stay on the Bed & Breakfast package, so its folio shows
    // the breakfast component riding each room night
    const bbStay = (
      await ctx.db
        .query("reservations")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .collect()
    ).find((r) => r.status === "inhouse" && !r.corporateAccountId && !r.ratePlanId);
    if (bbStay) await ctx.db.patch(bbStay._id, { ratePlanId: planIds["PKG-BB"] });

    // ---- group blocks + rooming lists -----------------------------
    const groupSeed = [
      {
        name: "Astra International — Leadership Offsite",
        status: "Definite",
        startOffset: 10,
        nights: 3,
        cutoffOffset: 3,
        contractLabel: "Signed",
        salesManager: "Rangga Putra",
        billing: "Master folio — all room & tax",
        depositStatus: "Received",
        depositAmount: "Rp 42,000,000",
        concessions:
          "1 comp room per 20, free meeting room, 15:00 late checkout for VIPs.",
        contact: "Dewi Anggraini · dewi.a@astra.co.id · +62 811 900 4471",
        subs: [
          { roomType: "Double Queen", blocked: 3, rate: "Rp 1,750,000" },
          { roomType: "King Suite", blocked: 2, rate: "Rp 2,400,000" },
        ],
        rooming: [
          { guest: "Dewi Anggraini", roomType: "King Suite", assign: true },
          { guest: "Arif Budiman", roomType: "Double Queen", assign: true },
          { guest: "Rina Kartika", roomType: "Double Queen", assign: false },
          { guest: "Hadi Santoso", roomType: "Double Queen", assign: true },
          { guest: "Lestari Dewi", roomType: "King Suite", assign: false },
        ],
      },
      {
        name: "Wijaya–Santoso Wedding",
        status: "Definite",
        startOffset: 19,
        nights: 2,
        cutoffOffset: 12,
        contractLabel: "Signed",
        salesManager: "Sari Melati",
        billing: "Split — room to guests, F&B to master",
        depositStatus: "Partial",
        depositAmount: "Rp 15,000,000 of Rp 30,000,000",
        concessions:
          "Complimentary bridal suite, welcome drinks, 20% spa discount for the party.",
        contact: "Putri Santoso · putri.s@gmail.com · +62 812 555 8890",
        subs: [
          { roomType: "Deluxe Twin", blocked: 4, rate: "Rp 1,380,000" },
          { roomType: "King Suite", blocked: 2, rate: "Rp 2,200,000" },
        ],
        rooming: [
          { guest: "Putri Santoso", roomType: "King Suite", assign: true },
          { guest: "Bagus Wijaya", roomType: "King Suite", assign: true },
          { guest: "Indah Permata", roomType: "Deluxe Twin", assign: false },
          { guest: "Rudi Hartono", roomType: "Deluxe Twin", assign: true },
        ],
      },
      {
        name: "Java Jazz Pre-Tour Crew",
        status: "In-house",
        startOffset: -1,
        nights: 3,
        cutoffOffset: -8,
        contractLabel: "Signed",
        salesManager: "Rangga Putra",
        billing: "Master folio — room only",
        depositStatus: "Received",
        depositAmount: "Rp 12,000,000",
        concessions: "Early check-in, storage room for equipment.",
        contact: "Tour Logistics · logistics@jjfest.id",
        subs: [{ roomType: "Double Queen", blocked: 3, rate: "Rp 1,600,000" }],
        rooming: [
          { guest: "Andre Situmorang", roomType: "Double Queen", assign: true },
          { guest: "Kevin Halim", roomType: "Double Queen", assign: true },
          { guest: "Marcus Tan", roomType: "Double Queen", assign: false },
        ],
      },
      {
        name: "TechCorp APAC Summit",
        status: "Tentative",
        startOffset: 28,
        nights: 3,
        cutoffOffset: 21,
        contractLabel: "Awaiting signature",
        salesManager: "Sari Melati",
        billing: "Master folio — all charges",
        depositStatus: "Not received",
        depositAmount: "Rp 0 of Rp 60,000,000",
        concessions:
          "Pending contract — proposed 2 comp rooms and a hospitality suite.",
        contact: "Michael Chen · m.chen@techcorp.com · +65 8123 4567",
        subs: [
          { roomType: "King Suite", blocked: 4, rate: "Rp 2,300,000" },
          { roomType: "Presidential Suite", blocked: 2, rate: "Rp 6,200,000" },
        ],
        rooming: [
          { guest: "Michael Chen (TechCorp)", roomType: "Presidential Suite", assign: false },
          { guest: "Sandra Lim", roomType: "King Suite", assign: false },
        ],
      },
    ];

    const usedRoomIds = new Set(
      (await ctx.db.query("reservations").collect())
        .map((r) => r.roomId)
        .filter(Boolean)
    );
    const freeRoomsByType: Record<string, typeof roomRows> = {};
    for (const rt of ROOM_TYPES) {
      freeRoomsByType[rt] = roomRows.filter(
        (r) => r.type === rt && !usedRoomIds.has(r._id)
      );
    }

    for (const gs of groupSeed) {
      const startDate = iso(addDays(TODAY, gs.startOffset));
      const groupId = await ctx.db.insert("group_blocks", {
        propertyId,
        name: gs.name,
        status: gs.status,
        startDate,
        nights: gs.nights,
        cutoffDate: iso(addDays(TODAY, gs.cutoffOffset)),
        contractLabel: gs.contractLabel,
        salesManager: gs.salesManager,
        billing: gs.billing,
        depositStatus: gs.depositStatus,
        depositAmount: gs.depositAmount,
        concessions: gs.concessions,
        contact: gs.contact,
      });
      const rateByType: Record<string, string> = {};
      for (const s of gs.subs) {
        rateByType[s.roomType] = s.rate;
        await ctx.db.insert("group_subblocks", {
          groupId,
          propertyId,
          roomType: s.roomType,
          blocked: s.blocked,
          rate: s.rate,
        });
      }
      for (const rm of gs.rooming) {
        const gId = await ctx.db.insert("guests", {
          name: rm.guest,
          email: `${rm.guest.toLowerCase().replace(/[^a-z]+/g, ".")}@group.example.com`,
          phone: "+62 811 700 0000",
          loyaltyTier: "Silver",
        });
        let roomId: (typeof roomRows)[number]["_id"] | undefined;
        let roomNumber: string | undefined;
        if (rm.assign) {
          const pool = freeRoomsByType[rm.roomType] ?? [];
          const room = pool.shift();
          if (room) {
            roomId = room._id;
            roomNumber = room.roomNumber;
          }
        }
        await ctx.db.insert("reservations", {
          guestId: gId,
          propertyId,
          roomId,
          roomNumber,
          checkIn: startDate,
          checkOut: iso(addDays(new Date(startDate + "T00:00:00Z"), gs.nights)),
          status: gs.status === "In-house" ? "inhouse" : "confirmed",
          rate: rateByType[rm.roomType] ?? "Rp 1,850,000",
          totalAmount: rateByType[rm.roomType] ?? "Rp 1,850,000",
          channel: "Group",
          roomType: rm.roomType,
          adults: 1,
          children: 0,
          groupId,
        });
      }
    }

    // ---- folios: every in-house / departed reservation with a room --
    // gets an open (or closed) folio with its nights posted at the rack
    // rate, so the night-audit trial balance reconciles to zero.
    const businessDateIso = iso(TODAY);
    const allRes = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    const departedFolioIds: import("./_generated/dataModel").Id<"folios">[] = [];
    for (const r of allRes) {
      if (r.status !== "inhouse" && r.status !== "departed") continue;
      if (!r.roomId || !r.roomType) continue;
      const departed = r.status === "departed";
      const lastNight = iso(
        addDays(new Date(r.checkOut + "T00:00:00Z"), -1)
      );
      const folioId = await ctx.db.insert("folios", {
        propertyId,
        reservationId: r._id,
        guestId: r.guestId,
        status: departed ? "closed" : "open",
        openedOn: r.checkIn,
        closedOn: departed ? r.checkOut : undefined,
      });
      if (departed) departedFolioIds.push(folioId);
      const folioDoc = await ctx.db.get(folioId);
      // Post through the same code path the night audit uses: room + tax at
      // the reservation's effective rate (plan / corporate aware) plus any
      // package components. Keeps seeded folios identical to live ones.
      for (
        let d = r.checkIn;
        d <= lastNight && d <= businessDateIso;
        d = iso(addDays(new Date(d + "T00:00:00Z"), 1))
      ) {
        if (folioDoc) await postNight(ctx, folioDoc, r, d);
      }
    }

    // ---- invoices for the checked-out folios ---------------------
    for (const fId of departedFolioIds) {
      await issueInvoiceForFolio(ctx, fId);
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

    // ---- city ledger / accounts receivable ----------------------
    const arAccounts = [
      {
        name: "Accor Global",
        type: "Corporate",
        creditLimit: 150_000_000,
        agreementId: corpIds[0],
        tx: [
          { off: -90, kind: "invoice", ref: "INV-2026-0712", desc: "Corporate rate — Jun", amount: 40_000_000 },
          { off: -58, kind: "invoice", ref: "INV-2026-0798", desc: "Corporate rate — Jul", amount: 22_200_000 },
          { off: -38, kind: "invoice", ref: "INV-2026-0841", desc: "Group block — Aug", amount: 62_000_000 },
          { off: -27, kind: "payment", ref: "PMT-3391", desc: "Payment received — bank transfer", amount: -40_000_000 },
        ],
      },
      {
        name: "TechCorp Inc",
        type: "Travel agent",
        creditLimit: 40_000_000,
        agreementId: corpIds[2],
        tx: [
          { off: -126, kind: "invoice", ref: "INV-2026-0655", desc: "TA allotment — May", amount: 23_000_000 },
          { off: -82, kind: "invoice", ref: "INV-2026-0740", desc: "TA allotment — Jul", amount: 12_500_000 },
          { off: -72, kind: "payment", ref: "PMT-3120", desc: "Payment received — cheque", amount: -18_000_000 },
          { off: -48, kind: "invoice", ref: "INV-2026-0820", desc: "TA allotment — Aug", amount: 6_400_000 },
        ],
      },
      {
        name: "Booking.com settlement",
        type: "OTA settlement",
        creditLimit: 0,
        matchChannel: "Booking.com",
        tx: [
          { off: -7, kind: "invoice", ref: "OTA-BK-09", desc: "Commission settlement (net)", amount: 18_600_000 },
          { off: -3, kind: "payment", ref: "PAYOUT-771", desc: "Payout received", amount: -18_600_000 },
        ],
      },
      {
        name: "Agoda settlement",
        type: "OTA settlement",
        creditLimit: 0,
        matchChannel: "Agoda",
        tx: [
          { off: -6, kind: "invoice", ref: "OTA-AG-09", desc: "Commission settlement (net)", amount: 9_400_000 },
        ],
      },
      {
        name: "Traveloka settlement",
        type: "OTA settlement",
        creditLimit: 0,
        matchChannel: "Traveloka",
        tx: [
          { off: -5, kind: "invoice", ref: "OTA-TV-09", desc: "Commission settlement (net)", amount: 6_200_000 },
        ],
      },
    ];
    for (const a of arAccounts) {
      const { tx, ...acc } = a;
      const accId = await ctx.db.insert("ar_accounts", { ...acc, propertyId });
      for (const t of tx) {
        await ctx.db.insert("ar_transactions", {
          accountId: accId,
          propertyId,
          date: iso(addDays(TODAY, t.off)),
          kind: t.kind,
          description: t.desc,
          ref: t.ref,
          amount: t.amount,
        });
      }
    }

    // ---- historical daily_stats + pickup snapshots --------------
    //   Night audit writes these going forward; seed backfills ~35 closed
    //   days so the reports screen (MTD, forecast, booking curve) has real
    //   history to render on a fresh install.
    const sellableRooms = roomRows.filter(
      (r) => r.status !== "OOO" && r.status !== "OOS"
    ).length;
    const oooRooms = roomRows.filter(
      (r) => r.status === "OOO" || r.status === "OOS"
    ).length;
    const dowOcc = [0.66, 0.7, 0.73, 0.78, 0.9, 0.94, 0.82]; // Sun..Sat
    const allResForStats = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();

    for (let off = -35; off <= -1; off++) {
      const dt = addDays(TODAY, off);
      const d = iso(dt);
      const occ = Math.min(
        0.98,
        dowOcc[dt.getUTCDay()] + ((off % 5) - 2) * 0.015
      );
      const roomsSold = Math.round(sellableRooms * occ);
      const adr = 1_820_000 + ((off % 7) - 3) * 45_000;
      const roomRevenue = roomsSold * adr;
      await ctx.db.insert("daily_stats", {
        propertyId,
        date: d,
        roomsSold,
        availableRooms: sellableRooms,
        oooRooms,
        roomRevenue,
        postedRoomRevenue: roomRevenue,
        variance: 0,
        balanced: true,
        adr,
        revpar: Math.round(roomRevenue / Math.max(1, sellableRooms)),
        occupancyPct: Math.round(occ * 100),
        arrivals: Math.round(roomsSold * 0.32),
        departures: Math.round(roomsSold * 0.3),
        closedAt: dt.getTime(),
      });
    }

    const overlaps = (r: (typeof allResForStats)[number], day: string) =>
      r.status !== "cancelled" &&
      r.status !== "no_show" &&
      r.checkIn <= day &&
      r.checkOut > day;
    for (const asOfOff of [-2, -1]) {
      const asOf = iso(addDays(TODAY, asOfOff));
      const decay = asOfOff === -2 ? 0.82 : 1; // earlier snapshot had fewer on the books
      for (let i = 0; i < 14; i++) {
        const forDate = iso(addDays(TODAY, asOfOff + i));
        const live = allResForStats.filter((r) => overlaps(r, forDate)).length;
        const roomsOnBooks = Math.max(0, Math.round(live * decay));
        await ctx.db.insert("pickup_snapshots", {
          propertyId,
          asOf,
          forDate,
          roomsOnBooks,
          revenueOnBooks: roomsOnBooks * 2_050_000,
        });
      }
    }

    // ---- activity feed seed (audit_log) -------------------------
    //   Every guest / money / rate mutation writes one of these going
    //   forward; seed a recent handful so the dashboard feed isn't blank.
    const auditSeed = [
      { minsAgo: 18, action: "reservation.status", target: "Sarah Wijaya", detail: "checked in to 118" },
      { minsAgo: 46, action: "maintenance.ticket", target: "AC not cooling — Room 204", detail: "room OOO" },
      { minsAgo: 92, action: "folio.payment", target: "Daniel Kim", detail: "Rp 2,600,000 · card" },
      { minsAgo: 140, action: "rate.plan", target: "PROMO-EB21", detail: "updated" },
      { minsAgo: 175, action: "reservation.rate_plan", target: "Putri Anggraini", detail: "CORP-ACCOR" },
      { minsAgo: 220, action: "invoice.issue", target: "INV-2026-0044", detail: "Rp 8,120,000" },
      { minsAgo: 310, action: "channel.terms", target: "Agoda", detail: "18% · merchant" },
    ];
    for (const a of auditSeed) {
      await ctx.db.insert("audit_log", {
        accountId,
        propertyId,
        actorEmail: OWNER_EMAIL,
        action: a.action,
        target: a.target,
        detail: a.detail,
        at: Date.now() - a.minsAgo * 60_000,
      });
    }

    return { success: true, rooms: roomRows.length, reservations: guestIds.length };
  },
});
