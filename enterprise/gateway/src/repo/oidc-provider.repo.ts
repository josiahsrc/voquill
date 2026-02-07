import type { OidcProvider } from "@repo/types";
import type { OidcProviderRow } from "../types/oidc-provider.types";
import { getPool } from "../utils/db.utils";

function rowToOidcProvider(row: OidcProviderRow): OidcProvider {
  return {
    id: row.id,
    name: row.name,
    issuerUrl: row.issuer_url,
    clientId: row.client_id,
    isEnabled: row.is_enabled,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listOidcProviders(): Promise<OidcProvider[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM oidc_providers ORDER BY created_at",
  );
  return result.rows.map(rowToOidcProvider);
}

export async function getOidcProviderRowById(
  id: string,
): Promise<OidcProviderRow | null> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM oidc_providers WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function upsertOidcProvider(opts: {
  id: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  clientSecretEncrypted?: string;
  isEnabled: boolean;
}): Promise<void> {
  const pool = getPool();
  const existing = await pool.query(
    "SELECT id FROM oidc_providers WHERE id = $1",
    [opts.id],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO oidc_providers (id, name, issuer_url, client_id, client_secret_encrypted, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        opts.id,
        opts.name,
        opts.issuerUrl,
        opts.clientId,
        opts.clientSecretEncrypted ?? "",
        opts.isEnabled,
      ],
    );
  } else if (opts.clientSecretEncrypted) {
    await pool.query(
      `UPDATE oidc_providers SET name = $1, issuer_url = $2, client_id = $3, client_secret_encrypted = $4, is_enabled = $5
       WHERE id = $6`,
      [
        opts.name,
        opts.issuerUrl,
        opts.clientId,
        opts.clientSecretEncrypted,
        opts.isEnabled,
        opts.id,
      ],
    );
  } else {
    await pool.query(
      `UPDATE oidc_providers SET name = $1, issuer_url = $2, client_id = $3, is_enabled = $4
       WHERE id = $5`,
      [opts.name, opts.issuerUrl, opts.clientId, opts.isEnabled, opts.id],
    );
  }
}

export async function deleteOidcProvider(id: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM oidc_providers WHERE id = $1", [id]);
}

export async function listEnabledOidcProviders(): Promise<OidcProvider[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM oidc_providers WHERE is_enabled = true ORDER BY created_at",
  );
  return result.rows.map(rowToOidcProvider);
}
