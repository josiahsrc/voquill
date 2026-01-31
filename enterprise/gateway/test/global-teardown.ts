import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/voquill";

async function cleanupTestData() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    const { rows } = await pool.query(
      "SELECT id FROM auth WHERE email LIKE '%@example.com'",
    );
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;

    await pool.query("DELETE FROM terms WHERE user_id = ANY($1)", [ids]);
    await pool.query("DELETE FROM members WHERE id = ANY($1)", [ids]);
    await pool.query("DELETE FROM users WHERE id = ANY($1)", [ids]);
    await pool.query("DELETE FROM auth WHERE id = ANY($1)", [ids]);
  } finally {
    await pool.end();
  }
}

export default async function globalSetup() {
  await cleanupTestData();
  return async () => {
    await cleanupTestData();
  };
}
