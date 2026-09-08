import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check every 15 minutes whether any property is due for its automatic night
// audit. The mutation itself decides which properties (if any) to roll.
crons.interval(
  "automatic night audit",
  { minutes: 15 },
  internal.properties.runScheduledNightAudits,
  {}
);

// Assign rooms to unassigned reservations (OTA / channel-manager pushes, API
// imports) for every property that has auto-assign switched on.
crons.interval(
  "auto-assign rooms",
  { minutes: 15 },
  internal.reservations.autoAssignSweep,
  {}
);

export default crons;
