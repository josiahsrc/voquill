import pg from "pg";

export * from "./audio";

const BASE_URL = process.env.GATEWAY_URL || "http://localhost:4630";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/voquill";

let pool: pg.Pool | null = null;

export function getTestPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

export async function query(
  sql: string,
  params?: unknown[],
): Promise<pg.QueryResult> {
  return getTestPool().query(sql, params);
}

export async function invoke(name: string, input: unknown, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/handler`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, input }),
  });

  const body = await res.json();
  if (!body.success) {
    throw new Error(`${res.status}: ${body.error}`);
  }
  return body.data;
}

export async function createTestSttProvider(token: string): Promise<void> {
  const adminToken = await promoteToAdmin(token);
  await invoke(
    "sttProvider/upsert",
    {
      provider: {
        id: "00000000-0000-0000-0000-000000000001",
        provider: "speaches",
        name: "Test Speaches",
        url: "http://speaches:8000/v1",
        model: "Systran/faster-whisper-base",
        apiKey: "sk-test-stt-provider-key",
        tier: 1,
      },
    },
    adminToken,
  );
}

export async function createTestLlmProvider(token: string): Promise<void> {
  const adminToken = await promoteToAdmin(token);
  await invoke(
    "llmProvider/upsert",
    {
      provider: {
        id: "00000000-0000-0000-0000-000000000002",
        provider: "ollama",
        name: "Test Ollama",
        url: "http://ollama:11434",
        model: "llama3.2:1b",
        apiKey: "sk-test-llm-provider-key",
        tier: 2,
      },
    },
    adminToken,
  );
}

const pendingCleanupIds: string[] = [];

export async function createTestAuth(
  email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
  password = "password123",
): Promise<{ token: string; refreshToken: string; auth: { id: string; email: string; isAdmin: boolean; createdAt: string } }> {
  const data = await invoke("auth/register", { email, password });
  pendingCleanupIds.push(data.auth.id);
  return data;
}

export async function cleanupTestAuths(): Promise<void> {
  const ids = pendingCleanupIds.splice(0);
  for (const id of ids) {
    await query("DELETE FROM tones WHERE user_id = $1", [id]);
    await query("DELETE FROM terms WHERE user_id = $1", [id]);
    await query("DELETE FROM members WHERE id = $1", [id]);
    await query("DELETE FROM users WHERE id = $1", [id]);
    await query("DELETE FROM auth WHERE id = $1", [id]);
  }
}

async function promoteToAdmin(token: string): Promise<string> {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString(),
  );
  await query("UPDATE auth SET is_admin = true WHERE id = $1", [
    payload.userId,
  ]);
  const data = await invoke("auth/login", {
    email: payload.email,
    password: "password123",
  });
  return data.token;
}
