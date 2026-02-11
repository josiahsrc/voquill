import { invoke, query, createTestAuth, cleanupTestAuths } from "../helpers";

afterAll(async () => {
  await query(
    "DELETE FROM ai_usage_metrics WHERE provider_name IN ('test-provider', 'simulated')",
  );
  await cleanupTestAuths();
});

describe("metrics", () => {
  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const adminData = await createTestAuth();
    adminId = adminData.auth.id;
    await query("UPDATE auth SET is_admin = TRUE WHERE id = $1", [adminId]);
    const refreshed = await invoke("auth/login", {
      email: adminData.auth.email,
      password: "password123",
    });
    adminToken = refreshed.token;

    const userData = await createTestAuth();
    userToken = userData.token;
    userId = userData.auth.id;

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO ai_usage_metrics (user_id, operation, provider_name, status, latency_ms, word_count, created_at)
       VALUES ($1, 'transcribe', 'test-provider', 'success', 200, 50, $2)`,
      [adminId, now],
    );
    await query(
      `INSERT INTO ai_usage_metrics (user_id, operation, provider_name, status, latency_ms, word_count, created_at)
       VALUES ($1, 'generate', 'test-provider', 'success', 300, 100, $2)`,
      [adminId, yesterday],
    );
    await query(
      `INSERT INTO ai_usage_metrics (user_id, operation, provider_name, status, latency_ms, word_count, created_at)
       VALUES ($1, 'transcribe', 'test-provider', 'error', 500, 0, $2)`,
      [adminId, tenDaysAgo],
    );
  });

  describe("getSummary", () => {
    it("returns aggregated metrics for 7d range", async () => {
      const data = await invoke("metrics/getSummary", { range: "7d" }, adminToken);

      expect(data.summary.totalRequests).toBeGreaterThanOrEqual(2);
      expect(data.summary.totalWords).toBeGreaterThanOrEqual(150);
      expect(data.summary.avgLatencyMs).toBeGreaterThan(0);
      expect(typeof data.summary.errorRate).toBe("number");
      expect(data.summary.activeUsers).toBeGreaterThanOrEqual(1);

      expect(Array.isArray(data.daily)).toBe(true);
      expect(Array.isArray(data.perUser)).toBe(true);
    });

    it("filters correctly for today range", async () => {
      const data = await invoke("metrics/getSummary", { range: "today" }, adminToken);

      expect(data.summary.totalRequests).toBeGreaterThanOrEqual(1);
      expect(data.summary.totalWords).toBeGreaterThanOrEqual(50);
    });

    it("returns all metrics for all range", async () => {
      const data = await invoke("metrics/getSummary", { range: "all" }, adminToken);

      expect(data.summary.totalRequests).toBeGreaterThanOrEqual(3);
    });

    it("includes per-user data with email and name", async () => {
      const data = await invoke("metrics/getSummary", { range: "all" }, adminToken);

      const adminMetrics = data.perUser.find(
        (u: { userId: string }) => u.userId === adminId,
      );
      expect(adminMetrics).toBeDefined();
      expect(adminMetrics.requests).toBeGreaterThanOrEqual(3);
      expect(typeof adminMetrics.email).toBe("string");
    });

    it("rejects non-admin users", async () => {
      await expect(
        invoke("metrics/getSummary", { range: "7d" }, userToken),
      ).rejects.toThrow("401");
    });

    it("rejects unauthenticated requests", async () => {
      await expect(
        invoke("metrics/getSummary", { range: "7d" }),
      ).rejects.toThrow("401");
    });
  });

  describe("populated by AI requests", () => {
    it("records a metric when transcribing audio", async () => {
      const before = await invoke("metrics/getSummary", { range: "all" }, adminToken);
      const beforeRequests = before.summary.totalRequests;

      await invoke(
        "ai/transcribeAudio",
        {
          audioBase64: Buffer.from("fake audio data").toString("base64"),
          audioMimeType: "audio/wav",
          simulate: true,
        },
        adminToken,
      );

      await new Promise((r) => setTimeout(r, 200));

      const after = await invoke("metrics/getSummary", { range: "all" }, adminToken);
      expect(after.summary.totalRequests).toBeGreaterThan(beforeRequests);

      const userMetric = after.perUser.find(
        (u: { userId: string }) => u.userId === adminId,
      );
      expect(userMetric).toBeDefined();
      expect(userMetric.words).toBeGreaterThan(0);
    });

    it("records a metric when generating text", async () => {
      const before = await invoke("metrics/getSummary", { range: "all" }, adminToken);
      const beforeRequests = before.summary.totalRequests;

      await invoke(
        "ai/generateText",
        {
          prompt: "Say hello",
          simulate: true,
        },
        adminToken,
      );

      await new Promise((r) => setTimeout(r, 200));

      const after = await invoke("metrics/getSummary", { range: "all" }, adminToken);
      expect(after.summary.totalRequests).toBeGreaterThan(beforeRequests);
    });

    it("tracks per-user breakdown after multiple requests", async () => {
      await invoke(
        "ai/transcribeAudio",
        {
          audioBase64: Buffer.from("more audio").toString("base64"),
          audioMimeType: "audio/wav",
          simulate: true,
        },
        userToken,
      );

      await new Promise((r) => setTimeout(r, 200));

      const data = await invoke("metrics/getSummary", { range: "all" }, adminToken);

      const adminMetric = data.perUser.find(
        (u: { userId: string }) => u.userId === adminId,
      );
      const secondMetric = data.perUser.find(
        (u: { userId: string }) => u.userId === userId,
      );

      expect(adminMetric).toBeDefined();
      expect(secondMetric).toBeDefined();
      expect(secondMetric.requests).toBeGreaterThanOrEqual(1);
    });
  });
});
