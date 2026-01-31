import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export const getPool = (): pg.Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
