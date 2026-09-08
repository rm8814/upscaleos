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

export default crons;
