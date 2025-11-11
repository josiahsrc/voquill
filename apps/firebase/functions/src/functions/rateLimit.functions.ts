import { onSchedule } from "firebase-functions/v2/scheduler";
import { clearRateLimits } from "../services/rateLimit.service";

// Every day
export const clearRateLimitsCron = onSchedule("0 0 * * *", async () => {
  await clearRateLimits();
});
