import type { HandlerInput, HandlerOutput } from "@repo/functions";
import type { AuthContext, Nullable } from "@repo/types";
import { getMetricsSummary } from "../repo/metrics.repo";
import { listAllUsers } from "../repo/user.repo";
import { requireAuth } from "../utils/auth.utils";
import { requireAdmin } from "../utils/validation.utils";

function rangeToDate(range: "today" | "7d" | "30d" | "all"): Date | null {
  const now = new Date();
  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (range === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

export async function getMetricsSummaryHandler(opts: {
  auth: Nullable<AuthContext>;
  input: HandlerInput<"metrics/getSummary">;
}): Promise<HandlerOutput<"metrics/getSummary">> {
  const auth = requireAuth(opts.auth);
  requireAdmin(auth);

  const since = rangeToDate(opts.input.range);
  const metrics = await getMetricsSummary(since);
  const users = await listAllUsers();

  const userMap = new Map(users.map((u) => [u.id, u]));

  const perUser = metrics.perUser.map((pu) => {
    const user = userMap.get(pu.userId);
    return {
      userId: pu.userId,
      email: user?.email ?? "",
      name: user?.name ?? "",
      requests: pu.requests,
      words: pu.words,
      avgLatencyMs: pu.avgLatencyMs,
      lastActiveAt: pu.lastActiveAt,
    };
  });

  return {
    summary: metrics.summary,
    daily: metrics.daily,
    perUser,
  };
}
