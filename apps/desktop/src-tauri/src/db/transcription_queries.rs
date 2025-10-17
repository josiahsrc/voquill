use sqlx::{Row, SqlitePool};

use crate::domain::Transcription;

pub async fn insert_transcription(
    pool: SqlitePool,
    transcription: &Transcription,
) -> Result<Transcription, sqlx::Error> {
    sqlx::query(
        "INSERT INTO transcriptions (id, transcript, timestamp)
         VALUES (?1, ?2, ?3)",
    )
    .bind(&transcription.id)
    .bind(&transcription.transcript)
    .bind(transcription.timestamp)
    .execute(&pool)
    .await?;

    Ok(transcription.clone())
}

pub async fn fetch_transcriptions(
    pool: SqlitePool,
    limit: u32,
    offset: u32,
) -> Result<Vec<Transcription>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, transcript, timestamp
         FROM transcriptions
         ORDER BY timestamp DESC
         LIMIT ?1 OFFSET ?2",
    )
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&pool)
    .await?;

    let transcriptions = rows
        .into_iter()
        .map(|row| Transcription {
            id: row.get::<String, _>("id"),
            transcript: row.get::<String, _>("transcript"),
            timestamp: row.get::<i64, _>("timestamp"),
        })
        .collect();

    Ok(transcriptions)
}

pub async fn delete_transcription(
    pool: SqlitePool,
    id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM transcriptions
         WHERE id = ?1",
    )
    .bind(id)
    .execute(&pool)
    .await?;

    Ok(())
}
