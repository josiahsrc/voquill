import { getPool } from "../utils/db.utils";

export async function insertMetric(opts: {
  userId: string;
  operation: string;
  providerName: string;
  status: string;
  latencyMs: number;
  wordCount: number;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO ai_usage_metrics (user_id, operation, provider_name, status, latency_ms, word_count)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      opts.userId,
      opts.operation,
      opts.providerName,
      opts.status,
      opts.latencyMs,
      opts.wordCount,
    ],
  );
}

export async function getMetricsSummary(since: Date | null): Promise<{
  summary: {
    totalRequests: number;
    totalWords: number;
    avgLatencyMs: number;
    avgTranscribeMs: number;
    avgPostProcessMs: number;
    errorRate: number;
    activeUsers: number;
  };
  daily: Array<{ date: string; requests: number; words: number }>;
  perUser: Array<{
    userId: string;
    requests: number;
    words: number;
    avgLatencyMs: number;
    lastActiveAt: string | null;
  }>;
  perProvider: Array<{
    providerName: string;
    requests: number;
    avgLatencyMs: number;
    errorCount: number;
    words: number;
  }>;
}> {
  const pool = getPool();
  const whereClause = since ? "WHERE created_at >= $1" : "";
  const params = since ? [since] : [];

  const summaryResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total_requests,
       COALESCE(SUM(word_count), 0)::int AS total_words,
       COALESCE(AVG(latency_ms), 0)::float AS avg_latency_ms,
       COALESCE(AVG(latency_ms) FILTER (WHERE operation = 'transcribe'), 0)::float AS avg_transcribe_ms,
       COALESCE(AVG(latency_ms) FILTER (WHERE operation = 'generate'), 0)::float AS avg_post_process_ms,
       COUNT(*) FILTER (WHERE status = 'error')::int AS error_count,
       COUNT(DISTINCT user_id)::int AS active_users
     FROM ai_usage_metrics ${whereClause}`,
    params,
  );

  const row = summaryResult.rows[0];
  const summary = {
    totalRequests: row.total_requests,
    totalWords: row.total_words,
    avgLatencyMs: Math.round(row.avg_latency_ms),
    avgTranscribeMs: Math.round(row.avg_transcribe_ms),
    avgPostProcessMs: Math.round(row.avg_post_process_ms),
    errorRate:
      row.total_requests > 0 ? row.error_count / row.total_requests : 0,
    activeUsers: row.active_users,
  };

  const dailyResult = await pool.query(
    `SELECT
       DATE(created_at)::text AS date,
       COUNT(*)::int AS requests,
       COALESCE(SUM(word_count), 0)::int AS words
     FROM ai_usage_metrics ${whereClause}
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at)`,
    params,
  );

  const daily = dailyResult.rows.map((r) => ({
    date: r.date,
    requests: r.requests,
    words: r.words,
  }));

  const perUserResult = await pool.query(
    `SELECT
       user_id,
       COUNT(*)::int AS requests,
       COALESCE(SUM(word_count), 0)::int AS words,
       COALESCE(AVG(latency_ms), 0)::float AS avg_latency_ms,
       MAX(created_at)::text AS last_active_at
     FROM ai_usage_metrics ${whereClause}
     GROUP BY user_id`,
    params,
  );

  const perUser = perUserResult.rows.map((r) => ({
    userId: r.user_id,
    requests: r.requests,
    words: r.words,
    avgLatencyMs: Math.round(r.avg_latency_ms),
    lastActiveAt: r.last_active_at,
  }));

  const perProviderResult = await pool.query(
    `SELECT
       provider_name,
       COUNT(*)::int AS requests,
       COALESCE(AVG(latency_ms), 0)::float AS avg_latency_ms,
       COUNT(*) FILTER (WHERE status = 'error')::int AS error_count,
       COALESCE(SUM(word_count), 0)::int AS words
     FROM ai_usage_metrics ${whereClause}
     GROUP BY provider_name`,
    params,
  );

  const perProvider = perProviderResult.rows.map((r) => ({
    providerName: r.provider_name,
    requests: r.requests,
    avgLatencyMs: Math.round(r.avg_latency_ms),
    errorCount: r.error_count,
    words: r.words,
  }));

  return { summary, daily, perUser, perProvider };
}
