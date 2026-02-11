export const METRICS_RANGES = ["today", "7d", "30d", "all"] as const;
export type MetricsRange = (typeof METRICS_RANGES)[number];

export type MetricsSummary = {
  totalRequests: number;
  totalWords: number;
  avgLatencyMs: number;
  errorRate: number;
  activeUsers: number;
};

export type MetricsDaily = {
  date: string;
  requests: number;
  words: number;
};

export type MetricsPerUser = {
  userId: string;
  email: string;
  name: string;
  requests: number;
  words: number;
  avgLatencyMs: number;
  lastActiveAt: string | null;
};
