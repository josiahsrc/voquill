use chrono::Utc;
use sqlx::{Row, SqlitePool};

use crate::domain::AppTarget;

pub async fn upsert_app_target(
    pool: SqlitePool,
    id: &str,
    name: &str,
) -> Result<AppTarget, sqlx::Error> {
    let existing_created_at = sqlx::query_scalar::<_, Option<String>>(
        "SELECT created_at FROM app_targets WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?;

    let created_at = existing_created_at.unwrap_or_else(|| Utc::now().to_rfc3339());

    sqlx::query(
        "INSERT INTO app_targets (id, name, created_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name",
    )
    .bind(id)
    .bind(name)
    .bind(&created_at)
    .execute(&pool)
    .await?;

    let row = sqlx::query(
        "SELECT id, name, created_at FROM app_targets WHERE id = ?1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(AppTarget {
        id: row.get("id"),
        name: row.get("name"),
        created_at: row.get("created_at"),
    })
}

pub async fn fetch_app_targets(
    pool: SqlitePool,
) -> Result<Vec<AppTarget>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, name, created_at FROM app_targets ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| AppTarget {
            id: row.get("id"),
            name: row.get("name"),
            created_at: row.get("created_at"),
        })
        .collect())
}
