use sqlx::{Row, SqlitePool};

pub async fn ensure_row(pool: SqlitePool) -> Result<u64, sqlx::Error> {
    sqlx::query(crate::db::SCHEMA_SQL).execute(&pool).await?;
    sqlx::query("INSERT OR IGNORE INTO users (id, option_key_count) VALUES (1, 0)")
        .execute(&pool)
        .await?;
    fetch_count(pool).await
}

pub async fn fetch_count(pool: SqlitePool) -> Result<u64, sqlx::Error> {
    let row = sqlx::query("SELECT option_key_count FROM users WHERE id = 1")
        .fetch_one(&pool)
        .await?;
    let count: i64 = row.try_get("option_key_count")?;
    Ok(count.max(0) as u64)
}

pub async fn increment_count(pool: SqlitePool) -> Result<u64, sqlx::Error> {
    sqlx::query("UPDATE users SET option_key_count = option_key_count + 1 WHERE id = 1")
        .execute(&pool)
        .await?;
    fetch_count(pool).await
}

pub async fn set_count(pool: SqlitePool, count: u64) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE users SET option_key_count = ?1 WHERE id = 1")
        .bind(count as i64)
        .execute(&pool)
        .await?;
    Ok(())
}
