import { query } from "./_generated/server";
import { v } from "convex/values";

const rupiah = (s: string | undefined) => Number((s ?? "").replace(/[^\d]/g, "")) || 0;
const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/** Guests who have at least one reservation at this property, with rollups. */
export const getGuestsForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const byGuest = new Map<string, typeof reservations>();
    for (const r of reservations) {
      const k = r.guestId as unknown as string;
      if (!byGuest.has(k)) byGuest.set(k, []);
      byGuest.get(k)!.push(r);
    }

    const rows = await Promise.all(
      Array.from(byGuest.entries()).map(async ([guestId, res]) => {
        const guest = await ctx.db.get(res[0].guestId);
        const stays = res.length;
        const lastStay = res
          .map((r) => r.checkOut)
          .sort()
          .reverse()[0];
        const ltv = res.reduce((s, r) => s + rupiah(r.totalAmount), 0);
        const channelCounts = res.reduce<Record<string, number>>((acc, r) => {
          const c = r.channel ?? "Direct";
          acc[c] = (acc[c] ?? 0) + 1;
          return acc;
        }, {});
        const source =
          Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Direct";
        return {
          guestId,
          name: guest?.name ?? "Unknown guest",
          email: guest?.email ?? "",
          phone: guest?.phone ?? "",
          tier: guest?.loyaltyTier ?? "Silver",
          preferences: guest?.preferences ?? "",
          stays,
          lastStay,
          ltv: fmtRp(ltv),
          ltvValue: ltv,
          source,
          marketingOptOut: guest?.marketingOptOut ?? false,
        };
      })
    );

    return rows.sort((a, b) => b.ltvValue - a.ltvValue);
  },
});

export const getGuestProfile = query({
  // Accept a raw string so a malformed id from the URL resolves to a graceful
  // "not found" instead of throwing at the arg validator.
  args: { guestId: v.string(), propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const guestId = ctx.db.normalizeId("guests", args.guestId);
    if (!guestId) return null;

    const guest = await ctx.db.get(guestId);
    if (!guest) return null;

    const all = await ctx.db
      .query("reservations")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const res = all
      .filter((r) => r.guestId === guestId)
      .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1));

    const stays = await Promise.all(
      res.map(async (r) => {
        let roomLabel = r.roomNumber ?? "";
        if (!roomLabel && r.roomId) {
          const room = await ctx.db.get(r.roomId);
          roomLabel = room?.roomNumber ?? "";
        }
        return {
          _id: r._id,
          dates: `${r.checkIn} – ${r.checkOut}`,
          room: `${roomLabel || "—"} · ${r.roomType ?? "—"}`,
          total: r.totalAmount,
          status: r.status,
        };
      })
    );

    const lifetime = res.reduce((s, r) => s + rupiah(r.totalAmount), 0);
    const upcoming = res.find((r) => r.status === "confirmed" || r.status === "tentative");
    const current = res.find((r) => r.status === "inhouse");
    const linked = current ?? upcoming ?? res[0];

    return {
      guestId: guestId as unknown as string,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      tier: guest.loyaltyTier,
      preferences: guest.preferences ?? "",
      gid: `GID-${(guest._id as unknown as string).slice(-6).toUpperCase()}`,
      stays,
      lifetimeSpend: fmtRp(lifetime),
      linkedRes: linked
        ? {
            label: `${linked.roomType ?? "Room"} · ${linked.checkIn} → ${linked.checkOut}`,
            sub: `${linked.status} · ${linked.channel ?? "Direct"}`,
            resId: `RSV-${(linked._id as unknown as string).slice(-6).toUpperCase()}`,
            folio: linked.totalAmount,
          }
        : null,
    };
  },
});
