use sqlx::SqlitePool;

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
