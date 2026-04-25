use chrono::Utc;
use sqlx::{Row, SqlitePool};

use crate::domain::AppTarget;

#[allow(clippy::too_many_arguments)]
pub async fn upsert_app_target(
    pool: SqlitePool,
    id: &str,
    name: &str,
    tone_id: Option<String>,
    icon_path: Option<String>,
    paste_keybind: Option<String>,
    insertion_method: Option<String>,
    typing_speed_ms: Option<i64>,
) -> Result<AppTarget, sqlx::Error> {
    let existing_created_at =
        sqlx::query_scalar::<_, Option<String>>("SELECT created_at FROM app_targets WHERE id = ?1")
            .bind(id)
            .fetch_optional(&pool)
            .await?;

    let created_at = existing_created_at
        .flatten()
        .unwrap_or_else(|| Utc::now().to_rfc3339());

    sqlx::query(
        "INSERT INTO app_targets (id, name, created_at, tone_id, icon_path, paste_keybind, insertion_method, typing_speed_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           tone_id = excluded.tone_id,
           icon_path = excluded.icon_path,
           paste_keybind = excluded.paste_keybind,
           insertion_method = excluded.insertion_method,
           typing_speed_ms = excluded.typing_speed_ms",
    )
    .bind(id)
    .bind(name)
    .bind(&created_at)
    .bind(tone_id)
    .bind(icon_path)
    .bind(paste_keybind)
    .bind(insertion_method)
    .bind(typing_speed_ms)
    .execute(&pool)
    .await?;

    let row = sqlx::query(
        "SELECT id, name, created_at, tone_id, icon_path, paste_keybind, insertion_method, typing_speed_ms FROM app_targets WHERE id = ?1",
    )
        .bind(id)
        .fetch_one(&pool)
        .await?;

    Ok(AppTarget {
        id: row.get("id"),
        name: row.get("name"),
        created_at: row.get("created_at"),
        tone_id: row.try_get("tone_id")?,
        icon_path: row.try_get("icon_path")?,
        paste_keybind: row.try_get("paste_keybind")?,
        insertion_method: row.try_get("insertion_method")?,
        typing_speed_ms: row.try_get("typing_speed_ms")?,
    })
}

pub async fn fetch_app_targets(pool: SqlitePool) -> Result<Vec<AppTarget>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, name, created_at, tone_id, icon_path, paste_keybind, insertion_method, typing_speed_ms FROM app_targets ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await?;

    let mut targets = Vec::with_capacity(rows.len());
    for row in rows {
        targets.push(AppTarget {
            id: row.get("id"),
            name: row.get("name"),
            created_at: row.get("created_at"),
            tone_id: row.try_get("tone_id")?,
            icon_path: row.try_get("icon_path")?,
            paste_keybind: row.try_get("paste_keybind")?,
            insertion_method: row.try_get("insertion_method")?,
            typing_speed_ms: row.try_get("typing_speed_ms")?,
        });
    }

    Ok(targets)
}
