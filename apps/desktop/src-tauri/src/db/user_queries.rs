use sqlx::{Row, SqlitePool};

use crate::domain::User;

pub async fn upsert_user(pool: SqlitePool, user: &User) -> Result<User, sqlx::Error> {
    sqlx::query(
        "INSERT INTO user_profiles (
             id,
             name,
             bio,
             onboarded,
             preferred_microphone,
             words_this_month,
             words_this_month_month,
             words_total,
             play_interaction_chime,
             preferred_transcription_mode,
             preferred_transcription_api_key_id,
             preferred_post_processing_mode,
             preferred_post_processing_api_key_id
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            bio = excluded.bio,
            onboarded = excluded.onboarded,
            preferred_microphone = excluded.preferred_microphone,
            words_this_month = excluded.words_this_month,
            words_this_month_month = excluded.words_this_month_month,
            words_total = excluded.words_total,
            play_interaction_chime = excluded.play_interaction_chime,
            preferred_transcription_mode = excluded.preferred_transcription_mode,
            preferred_transcription_api_key_id = excluded.preferred_transcription_api_key_id,
            preferred_post_processing_mode = excluded.preferred_post_processing_mode,
            preferred_post_processing_api_key_id = excluded.preferred_post_processing_api_key_id",
    )
    .bind(&user.id)
    .bind(&user.name)
    .bind(&user.bio)
    .bind(if user.onboarded { 1 } else { 0 })
    .bind(&user.preferred_microphone)
    .bind(&user.words_this_month)
    .bind(&user.words_this_month_month)
    .bind(&user.words_total)
    .bind(if user.play_interaction_chime { 1 } else { 0 })
    .bind(&user.preferred_transcription_mode)
    .bind(&user.preferred_transcription_api_key_id)
    .bind(&user.preferred_post_processing_mode)
    .bind(&user.preferred_post_processing_api_key_id)
    .execute(&pool)
    .await?;

    Ok(user.clone())
}

pub async fn fetch_user(pool: SqlitePool) -> Result<Option<User>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT
            id,
            name,
            bio,
            onboarded,
            preferred_microphone,
            words_this_month,
            words_this_month_month,
            words_total,
            play_interaction_chime,
            preferred_transcription_mode,
            preferred_transcription_api_key_id,
            preferred_post_processing_mode,
            preferred_post_processing_api_key_id
         FROM user_profiles
         LIMIT 1",
    )
    .fetch_optional(&pool)
    .await?;

    let user = match row {
        Some(row) => {
            let onboarded_raw = row.get::<i64, _>("onboarded");
            let play_interaction_raw = row.try_get::<i64, _>("play_interaction_chime").unwrap_or(1);
            Some(User {
                id: row.get::<String, _>("id"),
                name: row.get::<String, _>("name"),
                bio: row.get::<String, _>("bio"),
                onboarded: onboarded_raw != 0,
                preferred_microphone: row.get::<Option<String>, _>("preferred_microphone"),
                words_this_month: row
                    .try_get::<i64, _>("words_this_month")
                    .unwrap_or(0),
                words_this_month_month: row
                    .try_get::<Option<String>, _>("words_this_month_month")
                    .unwrap_or(None),
                words_total: row.try_get::<i64, _>("words_total").unwrap_or(0),
                play_interaction_chime: play_interaction_raw != 0,
                preferred_transcription_mode: row
                    .try_get::<Option<String>, _>("preferred_transcription_mode")
                    .unwrap_or(None),
                preferred_transcription_api_key_id: row
                    .try_get::<Option<String>, _>("preferred_transcription_api_key_id")
                    .unwrap_or(None),
                preferred_post_processing_mode: row
                    .try_get::<Option<String>, _>("preferred_post_processing_mode")
                    .unwrap_or(None),
                preferred_post_processing_api_key_id: row
                    .try_get::<Option<String>, _>("preferred_post_processing_api_key_id")
                    .unwrap_or(None),
            })
        }
        None => None,
    };

    Ok(user)
}
