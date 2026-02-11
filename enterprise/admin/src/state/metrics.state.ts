import type {
  MetricsDaily,
  MetricsPerUser,
  MetricsRange,
  MetricsSummary,
} from "@repo/types";
import type { ActionStatus } from "./login.state";

export type MetricsState = {
  summary: MetricsSummary | null;
  daily: MetricsDaily[];
  perUser: MetricsPerUser[];
  range: MetricsRange;
  status: ActionStatus;
};

export const INITIAL_METRICS_STATE: MetricsState = {
  summary: null,
  daily: [],
  perUser: [],
  range: "7d",
  status: "idle",
};
