use sqlx::{Row, SqlitePool};

use crate::domain::UserPreferences;

pub async fn upsert_user_preferences(
    pool: SqlitePool,
    preferences: &UserPreferences,
) -> Result<UserPreferences, sqlx::Error> {
    sqlx::query(
        "INSERT INTO user_preferences (
             user_id,
             transcription_mode,
             transcription_api_key_id,
             post_processing_mode,
             post_processing_api_key_id,
             active_tone_id,
             has_created_initial_tones
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(user_id) DO UPDATE SET
            transcription_mode = excluded.transcription_mode,
            transcription_api_key_id = excluded.transcription_api_key_id,
            post_processing_mode = excluded.post_processing_mode,
            post_processing_api_key_id = excluded.post_processing_api_key_id,
            active_tone_id = excluded.active_tone_id,
            has_created_initial_tones = excluded.has_created_initial_tones",
    )
    .bind(&preferences.user_id)
    .bind(&preferences.transcription_mode)
    .bind(&preferences.transcription_api_key_id)
    .bind(&preferences.post_processing_mode)
    .bind(&preferences.post_processing_api_key_id)
    .bind(&preferences.active_tone_id)
    .bind(if preferences.has_created_initial_tones { 1 } else { 0 })
    .execute(&pool)
    .await?;

    Ok(preferences.clone())
}

pub async fn fetch_user_preferences(
    pool: SqlitePool,
    user_id: &str,
) -> Result<Option<UserPreferences>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT
            user_id,
            transcription_mode,
            transcription_api_key_id,
            post_processing_mode,
            post_processing_api_key_id,
            active_tone_id,
            has_created_initial_tones
         FROM user_preferences
         WHERE user_id = ?1
         LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(&pool)
    .await?;

    let preferences = row.map(|row| UserPreferences {
        user_id: row.get::<String, _>("user_id"),
        transcription_mode: row
            .try_get::<Option<String>, _>("transcription_mode")
            .unwrap_or(None),
        transcription_api_key_id: row
            .try_get::<Option<String>, _>("transcription_api_key_id")
            .unwrap_or(None),
        post_processing_mode: row
            .try_get::<Option<String>, _>("post_processing_mode")
            .unwrap_or(None),
        post_processing_api_key_id: row
            .try_get::<Option<String>, _>("post_processing_api_key_id")
            .unwrap_or(None),
        active_tone_id: row
            .try_get::<Option<String>, _>("active_tone_id")
            .unwrap_or(None),
        has_created_initial_tones: row
            .get::<i64, _>("has_created_initial_tones")
            != 0,
    });

    Ok(preferences)
}

pub async fn clear_missing_active_tones(pool: SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE user_preferences
         SET active_tone_id = NULL
         WHERE active_tone_id IS NOT NULL
           AND active_tone_id NOT IN (SELECT id FROM tones)",
    )
    .execute(&pool)
    .await?;

    Ok(())
}
