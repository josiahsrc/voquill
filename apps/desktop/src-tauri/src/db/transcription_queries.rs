use sqlx::{sqlite::SqliteRow, Row, SqlitePool};

use crate::domain::{Transcription, TranscriptionAudioSnapshot};

fn serialize_warnings(warnings: &Option<Vec<String>>) -> Option<String> {
    warnings
        .as_ref()
        .and_then(|list| serde_json::to_string(list).ok())
}

fn row_to_transcription(row: SqliteRow) -> Result<Transcription, sqlx::Error> {
    let audio_path: Option<String> = row.try_get("audio_path")?;
    let audio_duration: Option<i64> = row.try_get("audio_duration_ms")?;
    let warnings_json: Option<String> = row.try_get("warnings_json")?;

    let audio = audio_path.map(|file_path| TranscriptionAudioSnapshot {
        file_path,
        duration_ms: audio_duration.unwrap_or_default(),
    });
    let warnings = match warnings_json {
        Some(json) => serde_json::from_str::<Vec<String>>(&json).ok(),
        None => None,
    };

    Ok(Transcription {
        id: row.get::<String, _>("id"),
        transcript: row.get::<String, _>("transcript"),
        timestamp: row.get::<i64, _>("timestamp"),
        audio,
        model_size: row.try_get::<Option<String>, _>("model_size")?,
        inference_device: row.try_get::<Option<String>, _>("inference_device")?,
        raw_transcript: row.try_get::<Option<String>, _>("raw_transcript")?,
        sanitized_transcript: row.try_get::<Option<String>, _>("sanitized_transcript")?,
        transcription_prompt: row.try_get::<Option<String>, _>("transcription_prompt")?,
        post_process_prompt: row.try_get::<Option<String>, _>("post_process_prompt")?,
        transcription_api_key_id: row.try_get::<Option<String>, _>("transcription_api_key_id")?,
        post_process_api_key_id: row.try_get::<Option<String>, _>("post_process_api_key_id")?,
        transcription_mode: row.try_get::<Option<String>, _>("transcription_mode")?,
        post_process_mode: row.try_get::<Option<String>, _>("post_process_mode")?,
        post_process_device: row.try_get::<Option<String>, _>("post_process_device")?,
        transcription_duration_ms: row.try_get::<Option<i64>, _>("transcription_duration_ms")?,
        postprocess_duration_ms: row.try_get::<Option<i64>, _>("postprocess_duration_ms")?,
        warnings,
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
             inference_device,
             raw_transcript,
             sanitized_transcript,
             transcription_prompt,
             post_process_prompt,
             transcription_api_key_id,
             post_process_api_key_id,
             transcription_mode,
             post_process_mode,
             post_process_device,
             transcription_duration_ms,
             postprocess_duration_ms,
             warnings_json
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
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
    .bind(transcription.raw_transcript.as_deref())
    .bind(transcription.sanitized_transcript.as_deref())
    .bind(transcription.transcription_prompt.as_deref())
    .bind(transcription.post_process_prompt.as_deref())
    .bind(transcription.transcription_api_key_id.as_deref())
    .bind(transcription.post_process_api_key_id.as_deref())
    .bind(transcription.transcription_mode.as_deref())
    .bind(transcription.post_process_mode.as_deref())
    .bind(transcription.post_process_device.as_deref())
    .bind(transcription.transcription_duration_ms)
    .bind(transcription.postprocess_duration_ms)
    .bind(serialize_warnings(&transcription.warnings))
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
                inference_device,
                raw_transcript,
                sanitized_transcript,
                transcription_prompt,
                post_process_prompt,
                transcription_api_key_id,
                post_process_api_key_id,
                transcription_mode,
                post_process_mode,
                post_process_device,
                transcription_duration_ms,
                postprocess_duration_ms,
                warnings_json
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
             inference_device = ?7,
             raw_transcript = ?8,
             sanitized_transcript = ?9,
             transcription_prompt = ?10,
             post_process_prompt = ?11,
             transcription_api_key_id = ?12,
             post_process_api_key_id = ?13,
             transcription_mode = ?14,
             post_process_mode = ?15,
             post_process_device = ?16,
             transcription_duration_ms = ?17,
             postprocess_duration_ms = ?18,
             warnings_json = ?19
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
    .bind(transcription.raw_transcript.as_deref())
    .bind(transcription.sanitized_transcript.as_deref())
    .bind(transcription.transcription_prompt.as_deref())
    .bind(transcription.post_process_prompt.as_deref())
    .bind(transcription.transcription_api_key_id.as_deref())
    .bind(transcription.post_process_api_key_id.as_deref())
    .bind(transcription.transcription_mode.as_deref())
    .bind(transcription.post_process_mode.as_deref())
    .bind(transcription.post_process_device.as_deref())
    .bind(transcription.transcription_duration_ms)
    .bind(transcription.postprocess_duration_ms)
    .bind(serialize_warnings(&transcription.warnings))
    .execute(&pool)
    .await?;

    let row = sqlx::query(
        "SELECT id,
                transcript,
                timestamp,
                audio_path,
                audio_duration_ms,
                model_size,
                inference_device,
                raw_transcript,
                sanitized_transcript,
                transcription_prompt,
                post_process_prompt,
                transcription_api_key_id,
                post_process_api_key_id,
                transcription_mode,
                post_process_mode,
                post_process_device,
                transcription_duration_ms,
                postprocess_duration_ms,
                warnings_json
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
