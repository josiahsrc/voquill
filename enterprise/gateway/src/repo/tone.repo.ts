import type { Tone } from "@repo/types";
import type { ToneRow } from "../types/tone.types";
import { getPool } from "../utils/db.utils";

function rowToTone(row: ToneRow): Tone {
  return {
    id: row.id,
    name: row.name,
    promptTemplate: row.prompt_template,
    isSystem: row.is_system,
    createdAt: row.created_at.getTime(),
    sortOrder: row.sort_order,
    isGlobal: row.is_global,
    ...(row.system_prompt_template != null && {
      systemPromptTemplate: row.system_prompt_template,
    }),
    ...(row.is_template_tone && { isTemplateTone: true }),
  };
}

export async function listTonesByUserId(userId: string): Promise<Tone[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM tones WHERE (user_id = $1 AND is_global = FALSE) OR is_global = TRUE ORDER BY sort_order, created_at",
    [userId],
  );
  return result.rows.map(rowToTone);
}

export async function upsertTone(userId: string, tone: Tone): Promise<void> {
  const pool = getPool();
  const existing = await pool.query(
    "SELECT id FROM tones WHERE id = $1 AND user_id = $2",
    [tone.id, userId],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO tones (id, user_id, name, prompt_template, is_system, sort_order, system_prompt_template, is_template_tone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tone.id,
        userId,
        tone.name,
        tone.promptTemplate,
        tone.isSystem,
        tone.sortOrder,
        tone.systemPromptTemplate ?? null,
        tone.isTemplateTone ?? false,
      ],
    );
  } else {
    await pool.query(
      `UPDATE tones SET name = $1, prompt_template = $2, is_system = $3, sort_order = $4, system_prompt_template = $5, is_template_tone = $6
       WHERE id = $7 AND user_id = $8`,
      [
        tone.name,
        tone.promptTemplate,
        tone.isSystem,
        tone.sortOrder,
        tone.systemPromptTemplate ?? null,
        tone.isTemplateTone ?? false,
        tone.id,
        userId,
      ],
    );
  }
}

export async function deleteTone(
  userId: string,
  toneId: string,
): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM tones WHERE id = $1 AND user_id = $2", [
    toneId,
    userId,
  ]);
}

export async function listGlobalTones(): Promise<Tone[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT * FROM tones WHERE is_global = TRUE ORDER BY sort_order, created_at",
  );
  return result.rows.map(rowToTone);
}

export async function upsertGlobalTone(
  userId: string,
  tone: Tone,
): Promise<void> {
  const pool = getPool();
  const existing = await pool.query(
    "SELECT id FROM tones WHERE id = $1 AND is_global = TRUE",
    [tone.id],
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO tones (id, user_id, name, prompt_template, is_system, sort_order, is_global, system_prompt_template, is_template_tone)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)`,
      [
        tone.id,
        userId,
        tone.name,
        tone.promptTemplate,
        tone.isSystem,
        tone.sortOrder,
        tone.systemPromptTemplate ?? null,
        tone.isTemplateTone ?? false,
      ],
    );
  } else {
    await pool.query(
      `UPDATE tones SET name = $1, prompt_template = $2, is_system = $3, sort_order = $4, system_prompt_template = $5, is_template_tone = $6
       WHERE id = $7 AND is_global = TRUE`,
      [
        tone.name,
        tone.promptTemplate,
        tone.isSystem,
        tone.sortOrder,
        tone.systemPromptTemplate ?? null,
        tone.isTemplateTone ?? false,
        tone.id,
      ],
    );
  }
}

export async function deleteGlobalTone(toneId: string): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM tones WHERE id = $1 AND is_global = TRUE", [
    toneId,
  ]);
}
