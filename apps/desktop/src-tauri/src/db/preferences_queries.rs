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
             post_processing_api_key_id
         )
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id) DO UPDATE SET
            transcription_mode = excluded.transcription_mode,
            transcription_api_key_id = excluded.transcription_api_key_id,
            post_processing_mode = excluded.post_processing_mode,
            post_processing_api_key_id = excluded.post_processing_api_key_id",
    )
    .bind(&preferences.user_id)
    .bind(&preferences.transcription_mode)
    .bind(&preferences.transcription_api_key_id)
    .bind(&preferences.post_processing_mode)
    .bind(&preferences.post_processing_api_key_id)
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
            post_processing_api_key_id
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
    });

    Ok(preferences)
}
