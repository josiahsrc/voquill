import type { SttProvider } from "@repo/types";
import type { SttProviderRow } from "../types/stt-provider.types";
import { getPool } from "../utils/db.utils";

function rowToSttProvider(row: SttProviderRow): SttProvider {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    url: row.url,
    apiKeySuffix: row.api_key_suffix,
    model: row.model,
    isEnabled: row.is_enabled,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listSttProviders(): Promise<SttProvider[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM stt_providers ORDER BY created_at",
  );
  return result.rows.map(rowToSttProvider);
}

export async function upsertSttProvider(opts: {
  id: string;
  provider: string;
  name: string;
  url: string;
  apiKeyEncrypted?: string;
  apiKeySuffix?: string;
  model: string;
  isEnabled: boolean;
}): Promise<void> {
  const pool = getPool();
  const existing = await pool.query(
    "SELECT id FROM stt_providers WHERE id = $1",
    [opts.id],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO stt_providers (id, provider, name, url, api_key_encrypted, api_key_suffix, model, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [opts.id, opts.provider, opts.name, opts.url, opts.apiKeyEncrypted, opts.apiKeySuffix, opts.model, opts.isEnabled],
    );
  } else if (opts.apiKeyEncrypted) {
    await pool.query(
      `UPDATE stt_providers SET provider = $1, name = $2, url = $3, api_key_encrypted = $4, api_key_suffix = $5, model = $6, is_enabled = $7
       WHERE id = $8`,
      [opts.provider, opts.name, opts.url, opts.apiKeyEncrypted, opts.apiKeySuffix, opts.model, opts.isEnabled, opts.id],
    );
  } else {
    await pool.query(
      `UPDATE stt_providers SET provider = $1, name = $2, url = $3, model = $4, is_enabled = $5
       WHERE id = $6`,
      [opts.provider, opts.name, opts.url, opts.model, opts.isEnabled, opts.id],
    );
  }
}

export async function listEnabledSttProvidersWithKeys(): Promise<SttProviderRow[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM stt_providers WHERE is_enabled = true ORDER BY created_at",
  );
  return result.rows;
}

export async function deleteSttProvider(id: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM stt_providers WHERE id = $1", [id]);
}
