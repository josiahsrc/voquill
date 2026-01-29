import type { Term } from "@repo/types";
import type { TermRow } from "../types/term.types";
import { getPool } from "../utils/db.utils";

function rowToTerm(row: TermRow): Term {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    sourceValue: row.source_value,
    destinationValue: row.destination_value,
    isReplacement: row.is_replacement,
    isGlobal: row.is_global,
  };
}

export async function listTermsByUserId(userId: string): Promise<Term[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM terms WHERE (user_id = $1 AND is_global = FALSE) OR is_global = TRUE ORDER BY created_at",
    [userId],
  );
  return result.rows.map(rowToTerm);
}

export async function upsertTerm(userId: string, term: Term): Promise<void> {
  const pool = getPool();
  const existing = await pool.query(
    "SELECT id FROM terms WHERE id = $1 AND user_id = $2",
    [term.id, userId],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO terms (id, user_id, source_value, destination_value, is_replacement)
       VALUES ($1, $2, $3, $4, $5)`,
      [term.id, userId, term.sourceValue, term.destinationValue, term.isReplacement],
    );
  } else {
    await pool.query(
      `UPDATE terms SET source_value = $1, destination_value = $2, is_replacement = $3
       WHERE id = $4 AND user_id = $5`,
      [term.sourceValue, term.destinationValue, term.isReplacement, term.id, userId],
    );
  }
}

export async function deleteTerm(userId: string, termId: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM terms WHERE id = $1 AND user_id = $2", [termId, userId]);
}

export async function listGlobalTerms(): Promise<Term[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM terms WHERE is_global = TRUE ORDER BY created_at",
  );
  return result.rows.map(rowToTerm);
}

export async function upsertGlobalTerm(userId: string, term: Term): Promise<void> {
  const pool = getPool();
  const existing = await pool.query(
    "SELECT id FROM terms WHERE id = $1 AND is_global = TRUE",
    [term.id],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO terms (id, user_id, source_value, destination_value, is_replacement, is_global)
       VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [term.id, userId, term.sourceValue, term.destinationValue, term.isReplacement],
    );
  } else {
    await pool.query(
      `UPDATE terms SET source_value = $1, destination_value = $2, is_replacement = $3
       WHERE id = $4 AND is_global = TRUE`,
      [term.sourceValue, term.destinationValue, term.isReplacement, term.id],
    );
  }
}

export async function deleteGlobalTerm(termId: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM terms WHERE id = $1 AND is_global = TRUE", [termId]);
}
