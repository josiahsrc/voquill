import type { ProviderPurpose, ProviderRow } from "../types/provider.types";
import { getPool } from "../utils/db.utils";

function rowToProvider(row: ProviderRow) {
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

export async function listProviders(purpose: ProviderPurpose) {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM providers WHERE purpose = $1 ORDER BY created_at",
    [purpose],
  );
  return result.rows.map(rowToProvider);
}

export async function upsertProvider(
  purpose: ProviderPurpose,
  opts: {
    id: string;
    provider: string;
    name: string;
    url: string;
    apiKeyEncrypted?: string;
    apiKeySuffix?: string;
    model: string;
    isEnabled: boolean;
  },
): Promise<void> {
  const pool = getPool();
  const existing = await pool.query(
    "SELECT id FROM providers WHERE id = $1",
    [opts.id],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO providers (id, purpose, provider, name, url, api_key_encrypted, api_key_suffix, model, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [opts.id, purpose, opts.provider, opts.name, opts.url, opts.apiKeyEncrypted, opts.apiKeySuffix, opts.model, opts.isEnabled],
    );
  } else if (opts.apiKeyEncrypted) {
    await pool.query(
      `UPDATE providers SET provider = $1, name = $2, url = $3, api_key_encrypted = $4, api_key_suffix = $5, model = $6, is_enabled = $7
       WHERE id = $8`,
      [opts.provider, opts.name, opts.url, opts.apiKeyEncrypted, opts.apiKeySuffix, opts.model, opts.isEnabled, opts.id],
    );
  } else {
    await pool.query(
      `UPDATE providers SET provider = $1, name = $2, url = $3, model = $4, is_enabled = $5
       WHERE id = $6`,
      [opts.provider, opts.name, opts.url, opts.model, opts.isEnabled, opts.id],
    );
  }
}

export async function deleteProvider(id: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM providers WHERE id = $1", [id]);
}
