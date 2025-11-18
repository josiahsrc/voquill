use sqlx::{Row, SqlitePool};

use crate::domain::Tone;

pub async fn insert_tone(pool: SqlitePool, tone: &Tone) -> Result<Tone, sqlx::Error> {
    sqlx::query(
        "INSERT INTO tones (
             id,
             name,
             prompt_template,
             created_at,
             sort_order
         )
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(&tone.id)
    .bind(&tone.name)
    .bind(&tone.prompt_template)
    .bind(tone.created_at)
    .bind(tone.sort_order)
    .execute(&pool)
    .await?;

    Ok(tone.clone())
}

pub async fn update_tone(pool: SqlitePool, tone: &Tone) -> Result<Tone, sqlx::Error> {
    sqlx::query(
        "UPDATE tones SET
            name = ?2,
            prompt_template = ?3,
            sort_order = ?4
         WHERE id = ?1",
    )
    .bind(&tone.id)
    .bind(&tone.name)
    .bind(&tone.prompt_template)
    .bind(tone.sort_order)
    .execute(&pool)
    .await?;

    Ok(tone.clone())
}

pub async fn delete_tone(pool: SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tones WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await?;

    Ok(())
}

pub async fn fetch_tone_by_id(pool: SqlitePool, id: &str) -> Result<Option<Tone>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT id, name, prompt_template, created_at, sort_order FROM tones WHERE id = ?1 LIMIT 1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?;

    let tone = row.map(|row| Tone {
        id: row.get::<String, _>("id"),
        name: row.get::<String, _>("name"),
        prompt_template: row.get::<String, _>("prompt_template"),
        created_at: row.get::<i64, _>("created_at"),
        sort_order: row.get::<i32, _>("sort_order"),
    });

    Ok(tone)
}

pub async fn fetch_all_tones(pool: SqlitePool) -> Result<Vec<Tone>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, name, prompt_template, created_at, sort_order
         FROM tones
         ORDER BY sort_order ASC, created_at ASC",
    )
    .fetch_all(&pool)
    .await?;

    let tones = rows
        .into_iter()
        .map(|row| Tone {
            id: row.get::<String, _>("id"),
            name: row.get::<String, _>("name"),
            prompt_template: row.get::<String, _>("prompt_template"),
            created_at: row.get::<i64, _>("created_at"),
            sort_order: row.get::<i32, _>("sort_order"),
        })
        .collect();

    Ok(tones)
}

pub async fn count_tones(pool: SqlitePool) -> Result<i64, sqlx::Error> {
    let row = sqlx::query("SELECT COUNT(*) as count FROM tones")
        .fetch_one(&pool)
        .await?;

    Ok(row.get::<i64, _>("count"))
}

pub async fn delete_all_tones(pool: SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tones").execute(&pool).await?;

    Ok(())
}
