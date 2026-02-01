import fs from "fs";
import path from "path";
import { getPool } from "../utils/db.utils";

const MIGRATIONS_DIR = path.join(__dirname, "db", "migrations");

async function ensureMigrationsTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const pool = getPool();
  const result = await pool.query("SELECT name FROM _migrations ORDER BY name");
  return new Set(result.rows.map((row) => row.name));
}

async function getMigrationFiles(): Promise<string[]> {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function applyMigration(filename: string): Promise<void> {
  const pool = getPool();
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
      filename,
    ]);
    await client.query("COMMIT");
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  console.log("Running database migrations...");

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();

  let migrationsRun = 0;
  for (const file of files) {
    if (!applied.has(file)) {
      await applyMigration(file);
      migrationsRun++;
    }
  }

  if (migrationsRun === 0) {
    console.log("No new migrations to apply");
  } else {
    console.log(`Applied ${migrationsRun} migration(s)`);
  }
}
