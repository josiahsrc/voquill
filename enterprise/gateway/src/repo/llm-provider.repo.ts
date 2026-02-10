import type { LlmProvider } from "@repo/types";
import type { LlmProviderRow } from "../types/llm-provider.types";
import { getPool } from "../utils/db.utils";

function rowToLlmProvider(row: LlmProviderRow): LlmProvider {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    url: row.url,
    apiKeySuffix: row.api_key_suffix,
    model: row.model,
    tier: row.tier,
    pullStatus: row.pull_status as LlmProvider["pullStatus"],
    pullError: row.pull_error,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listLlmProviders(): Promise<LlmProvider[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM llm_providers ORDER BY created_at",
  );
  return result.rows.map(rowToLlmProvider);
}

export async function upsertLlmProvider(opts: {
  id: string;
  provider: string;
  name: string;
  url: string;
  apiKeyEncrypted?: string;
  apiKeySuffix?: string;
  model: string;
  tier: number;
}): Promise<void> {
  const pool = getPool();
  const existing = await pool.query(
    "SELECT id FROM llm_providers WHERE id = $1",
    [opts.id],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO llm_providers (id, provider, name, url, api_key_encrypted, api_key_suffix, model, tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        opts.id,
        opts.provider,
        opts.name,
        opts.url,
        opts.apiKeyEncrypted ?? "",
        opts.apiKeySuffix ?? "",
        opts.model,
        opts.tier,
      ],
    );
  } else if (opts.apiKeyEncrypted) {
    await pool.query(
      `UPDATE llm_providers SET provider = $1, name = $2, url = $3, api_key_encrypted = $4, api_key_suffix = $5, model = $6, tier = $7
       WHERE id = $8`,
      [
        opts.provider,
        opts.name,
        opts.url,
        opts.apiKeyEncrypted,
        opts.apiKeySuffix,
        opts.model,
        opts.tier,
        opts.id,
      ],
    );
  } else {
    await pool.query(
      `UPDATE llm_providers SET provider = $1, name = $2, url = $3, model = $4, tier = $5
       WHERE id = $6`,
      [opts.provider, opts.name, opts.url, opts.model, opts.tier, opts.id],
    );
  }
}

export async function listActiveLlmProvidersWithKeys(): Promise<LlmProviderRow[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM llm_providers WHERE tier > 0 ORDER BY tier, created_at",
  );
  return result.rows;
}

export async function getLlmProviderRowById(
  id: string,
): Promise<LlmProviderRow | null> {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM llm_providers WHERE id = $1", [
    id,
  ]);
  return result.rows[0] ?? null;
}

export async function getLlmProviderById(
  id: string,
): Promise<LlmProvider | null> {
  const row = await getLlmProviderRowById(id);
  return row ? rowToLlmProvider(row) : null;
}

export async function updateLlmPullStatus(
  id: string,
  pullStatus: string,
  pullError: string | null,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    "UPDATE llm_providers SET pull_status = $1, pull_error = $2 WHERE id = $3",
    [pullStatus, pullError, id],
  );
}

export async function deleteLlmProvider(id: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM llm_providers WHERE id = $1", [id]);
}
