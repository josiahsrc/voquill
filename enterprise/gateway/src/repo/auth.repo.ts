import type { Auth } from "@repo/types";
import type { AuthRow } from "../types/auth.types";
import { getPool } from "../utils/db.utils";

function rowToAuth(row: Record<string, unknown>): Auth {
  return {
    id: row.id as string,
    email: row.email as string,
    isAdmin: row.is_admin as boolean,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export async function findAuthById(id: string): Promise<Auth | null> {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM auth WHERE id = $1", [id]);
  return result.rows[0] ? rowToAuth(result.rows[0]) : null;
}

export async function findAuthByEmail(
  email: string
): Promise<AuthRow | null> {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM auth WHERE email = $1", [
    email,
  ]);
  return result.rows[0] ?? null;
}

export async function createAuth(
  email: string,
  passwordHash: string
): Promise<Auth> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO auth (email, password_hash)
     VALUES ($1, $2)
     RETURNING *`,
    [email, passwordHash]
  );
  return rowToAuth(result.rows[0]);
}

export async function setIsAdmin(
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  const pool = getPool();
  const result = await pool.query(
    "UPDATE auth SET is_admin = $1 WHERE id = $2",
    [isAdmin, userId],
  );
  if (result.rowCount === 0) {
    throw new Error("User not found");
  }
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  const pool = getPool();
  const result = await pool.query(
    "UPDATE auth SET password_hash = $1 WHERE id = $2",
    [passwordHash, userId],
  );
  if (result.rowCount === 0) {
    throw new Error("User not found");
  }
}

export async function hasAnyAdmin(): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query("SELECT id FROM auth WHERE is_admin = TRUE LIMIT 1");
  return result.rows.length > 0;
}

export async function deleteAuthById(id: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM terms WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM members WHERE id = $1", [id]);
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
  const result = await pool.query("DELETE FROM auth WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    throw new Error("User not found");
  }
}

export async function countAll(): Promise<number> {
  const pool = getPool();
  const result = await pool.query("SELECT COUNT(*) AS count FROM auth");
  return parseInt(result.rows[0].count, 10);
}

export async function existsByEmail(email: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query("SELECT id FROM auth WHERE email = $1", [
    email,
  ]);
  return result.rows.length > 0;
}
