import type { Member, Nullable } from "@repo/types";
import type { MemberRow } from "../types/member.types";
import { getPool } from "../utils/db.utils";

function rowToMember(row: MemberRow): Member {
  return {
    id: row.id,
    type: "user",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    plan: row.plan,
    stripeCustomerId: row.stripe_customer_id,
    priceId: row.price_id,
    wordsToday: row.words_today,
    wordsThisMonth: row.words_this_month,
    wordsTotal: row.words_total,
    tokensToday: row.tokens_today,
    tokensThisMonth: row.tokens_this_month,
    tokensTotal: row.tokens_total,
    todayResetAt: row.today_reset_at.toISOString(),
    thisMonthResetAt: row.this_month_reset_at.toISOString(),
    isOnTrial: row.is_on_trial,
    trialEndsAt: row.trial_ends_at?.toISOString() ?? null,
  };
}

export async function findMemberById(id: string): Promise<Nullable<Member>> {
  const pool = getPool();
  const result = await pool.query("SELECT * FROM members WHERE id = $1", [id]);
  if (result.rows.length === 0) return null;
  return rowToMember(result.rows[0]);
}

export async function createMember(id: string): Promise<void> {
  const pool = getPool();
  const existing = await pool.query("SELECT id FROM members WHERE id = $1", [
    id,
  ]);
  if (existing.rows.length > 0) return;
  await pool.query("INSERT INTO members (id) VALUES ($1)", [id]);
}
