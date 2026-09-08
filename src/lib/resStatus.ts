export type ResStatus =
  | "tentative"
  | "confirmed"
  | "inhouse"
  | "departed"
  | "cancelled";

export interface ResAction {
  label: string;
  next: ResStatus;
  tone: "primary" | "neutral" | "danger";
}

/**
 * The status transitions a user may apply to a reservation, given its current
 * status and whether the guest has reached the arrival date.
 *
 *   tentative  → Confirm | Cancel reservation
 *   confirmed  → Check in (arrival day or later) | Set tentative | Cancel reservation
 *   inhouse    → Check out | Cancel check-in (undo)
 *   departed   → Cancel check-out (undo)
 *   cancelled  → Reinstate
 */
export function reservationActions(
  status: string,
  checkIn: string,
  businessDate: string
): { actions: ResAction[]; note?: string } {
  switch (status) {
    case "tentative":
      return {
        actions: [
          { label: "Confirm", next: "confirmed", tone: "primary" },
          { label: "Cancel reservation", next: "cancelled", tone: "danger" },
        ],
      };
    case "confirmed": {
      const arrived = businessDate >= checkIn;
      return {
        actions: [
          ...(arrived
            ? ([{ label: "Check in", next: "inhouse", tone: "primary" }] as ResAction[])
            : []),
          { label: "Cancel reservation", next: "cancelled", tone: "danger" },
        ],
        note: arrived
          ? undefined
          : `Check-in opens on the arrival date (${checkIn}).`,
      };
    }
    case "inhouse":
      return {
        actions: [
          { label: "Check out", next: "departed", tone: "primary" },
          { label: "Cancel check-in", next: "confirmed", tone: "neutral" },
        ],
      };
    case "departed":
      return {
        actions: [
          { label: "Cancel check-out", next: "inhouse", tone: "primary" },
        ],
      };
    case "cancelled":
      return {
        actions: [{ label: "Reinstate", next: "confirmed", tone: "primary" }],
      };
    default:
      return { actions: [] };
  }
}
