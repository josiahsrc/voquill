use sqlx::{sqlite::SqliteRow, Row, SqlitePool};

use crate::domain::{Transcription, TranscriptionAudioSnapshot};

fn row_to_transcription(row: SqliteRow) -> Result<Transcription, sqlx::Error> {
    let audio_path: Option<String> = row.try_get("audio_path")?;
    let audio_duration: Option<i64> = row.try_get("audio_duration_ms")?;

    let audio = audio_path.map(|file_path| TranscriptionAudioSnapshot {
        file_path,
        duration_ms: audio_duration.unwrap_or_default(),
    });

    Ok(Transcription {
        id: row.get::<String, _>("id"),
        transcript: row.get::<String, _>("transcript"),
        timestamp: row.get::<i64, _>("timestamp"),
        audio,
        model_size: row.try_get::<Option<String>, _>("model_size")?,
        inference_device: row.try_get::<Option<String>, _>("inference_device")?,
    })
}

pub async fn insert_transcription(
    pool: SqlitePool,
    transcription: &Transcription,
) -> Result<Transcription, sqlx::Error> {
    sqlx::query(
        "INSERT INTO transcriptions (
             id,
             transcript,
             timestamp,
             audio_path,
             audio_duration_ms,
             model_size,
             inference_device
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(&transcription.id)
    .bind(&transcription.transcript)
    .bind(transcription.timestamp)
    .bind(
        transcription
            .audio
            .as_ref()
            .map(|audio| audio.file_path.as_str()),
    )
    .bind(transcription.audio.as_ref().map(|audio| audio.duration_ms))
    .bind(transcription.model_size.as_deref())
    .bind(transcription.inference_device.as_deref())
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
        "SELECT id,
                transcript,
                timestamp,
                audio_path,
                audio_duration_ms,
                model_size,
                inference_device
         FROM transcriptions
         ORDER BY timestamp DESC
         LIMIT ?1 OFFSET ?2",
    )
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&pool)
    .await?;

    let mut transcriptions = Vec::with_capacity(rows.len());

    for row in rows {
        transcriptions.push(row_to_transcription(row)?);
    }

    Ok(transcriptions)
}

pub async fn update_transcription(
    pool: SqlitePool,
    transcription: &Transcription,
) -> Result<Transcription, sqlx::Error> {
    sqlx::query(
        "UPDATE transcriptions
         SET transcript = ?2,
             timestamp = ?3,
             audio_path = ?4,
             audio_duration_ms = ?5,
             model_size = ?6,
             inference_device = ?7
         WHERE id = ?1",
    )
    .bind(&transcription.id)
    .bind(&transcription.transcript)
    .bind(transcription.timestamp)
    .bind(
        transcription
            .audio
            .as_ref()
            .map(|audio| audio.file_path.as_str()),
    )
    .bind(transcription.audio.as_ref().map(|audio| audio.duration_ms))
    .bind(transcription.model_size.as_deref())
    .bind(transcription.inference_device.as_deref())
    .execute(&pool)
    .await?;

    let row = sqlx::query(
        "SELECT id,
                transcript,
                timestamp,
                audio_path,
                audio_duration_ms,
                model_size,
                inference_device
         FROM transcriptions
         WHERE id = ?1",
    )
    .bind(&transcription.id)
    .fetch_optional(&pool)
    .await?
    .ok_or(sqlx::Error::RowNotFound)?;

    row_to_transcription(row)
}

pub async fn delete_transcription(pool: SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM transcriptions
         WHERE id = ?1",
    )
    .bind(id)
    .execute(&pool)
    .await?;

    Ok(())
}
