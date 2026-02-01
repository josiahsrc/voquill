import type { User, UserWithAuth, Nullable } from "@repo/types";
import type { UserRow } from "../types/user.types";
import { getPool } from "../utils/db.utils";

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    name: row.name,
    bio: row.bio,
    company: row.company,
    title: row.title,
    onboarded: row.onboarded,
    onboardedAt: row.onboarded_at?.toISOString() ?? null,
    timezone: row.timezone,
    preferredLanguage: row.preferred_language,
    preferredMicrophone: row.preferred_microphone,
    playInteractionChime: row.play_interaction_chime,
    hasFinishedTutorial: row.has_finished_tutorial,
    wordsThisMonth: row.words_this_month,
    wordsThisMonthMonth: row.words_this_month_month,
    wordsTotal: row.words_total,
    hasMigratedPreferredMicrophone: row.has_migrated_preferred_microphone,
    cohort: row.cohort,
    shouldShowUpgradeDialog: row.should_show_upgrade_dialog,
    stylingMode: row.styling_mode as User["stylingMode"],
    selectedToneId: row.selected_tone_id,
  };
}

export async function findUserById(id: string): Promise<Nullable<User>> {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

function defaultUser(id: string): User {
  return {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: "",
    bio: null,
    company: null,
    title: null,
    onboarded: false,
    onboardedAt: null,
    timezone: null,
    preferredLanguage: null,
    preferredMicrophone: null,
    playInteractionChime: true,
    hasFinishedTutorial: false,
    wordsThisMonth: 0,
    wordsThisMonthMonth: null,
    wordsTotal: 0,
    hasMigratedPreferredMicrophone: false,
    cohort: null,
    shouldShowUpgradeDialog: false,
    stylingMode: null,
    selectedToneId: null,
  };
}

export async function listAllUsers(): Promise<UserWithAuth[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT u.*, a.id, a.email, a.is_admin, a.created_at AS auth_created_at
     FROM auth a
     LEFT JOIN users u ON u.id = a.id
     ORDER BY a.created_at`,
  );
  return result.rows.map((row) => ({
    ...defaultUser(row.id),
    createdAt: row.auth_created_at.toISOString(),
    ...(row.created_at ? rowToUser(row) : {}),
    email: row.email,
    isAdmin: row.is_admin,
  }));
}

export async function upsertUser(
  id: string,
  value: Partial<User>,
): Promise<void> {
  const pool = getPool();

  const existing = await pool.query("SELECT id FROM users WHERE id = $1", [id]);

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO users (
        id, name, bio, company, title, onboarded, onboarded_at,
        timezone, preferred_language, preferred_microphone,
        play_interaction_chime, has_finished_tutorial,
        words_this_month, words_this_month_month, words_total,
        has_migrated_preferred_microphone, cohort, should_show_upgrade_dialog, styling_mode, selected_tone_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        id,
        value.name ?? "",
        value.bio ?? null,
        value.company ?? null,
        value.title ?? null,
        value.onboarded ?? false,
        value.onboardedAt ?? null,
        value.timezone ?? null,
        value.preferredLanguage ?? null,
        value.preferredMicrophone ?? null,
        value.playInteractionChime ?? true,
        value.hasFinishedTutorial ?? false,
        value.wordsThisMonth ?? 0,
        value.wordsThisMonthMonth ?? null,
        value.wordsTotal ?? 0,
        value.hasMigratedPreferredMicrophone ?? false,
        value.cohort ?? null,
        value.shouldShowUpgradeDialog ?? false,
        value.stylingMode ?? null,
        value.selectedToneId ?? null,
      ],
    );
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    name: "name",
    bio: "bio",
    company: "company",
    title: "title",
    onboarded: "onboarded",
    onboardedAt: "onboarded_at",
    timezone: "timezone",
    preferredLanguage: "preferred_language",
    preferredMicrophone: "preferred_microphone",
    playInteractionChime: "play_interaction_chime",
    hasFinishedTutorial: "has_finished_tutorial",
    wordsThisMonth: "words_this_month",
    wordsThisMonthMonth: "words_this_month_month",
    wordsTotal: "words_total",
    hasMigratedPreferredMicrophone: "has_migrated_preferred_microphone",
    cohort: "cohort",
    shouldShowUpgradeDialog: "should_show_upgrade_dialog",
    stylingMode: "styling_mode",
    selectedToneId: "selected_tone_id",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in value) {
      fields.push(`${column} = $${paramIndex}`);
      values.push((value as Record<string, unknown>)[key]);
      paramIndex++;
    }
  }

  if (fields.length === 0) return;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIndex}`,
    values,
  );
}
