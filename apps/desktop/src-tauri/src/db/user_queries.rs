use sqlx::{Row, SqlitePool};

use crate::domain::User;

pub async fn upsert_user(pool: SqlitePool, user: &User) -> Result<User, sqlx::Error> {
    sqlx::query(
        "INSERT INTO user_profiles (
             id,
             name,
             bio,
             company,
             title,
             onboarded,
             preferred_microphone,
             preferred_language,
             words_this_month,
             words_this_month_month,
             words_total,
             play_interaction_chime,
             has_finished_tutorial,
             has_migrated_preferred_microphone,
             cohort,
             styling_mode
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            bio = excluded.bio,
            company = excluded.company,
            title = excluded.title,
            onboarded = excluded.onboarded,
            preferred_microphone = excluded.preferred_microphone,
            preferred_language = excluded.preferred_language,
            words_this_month = excluded.words_this_month,
            words_this_month_month = excluded.words_this_month_month,
            words_total = excluded.words_total,
            play_interaction_chime = excluded.play_interaction_chime,
            has_finished_tutorial = excluded.has_finished_tutorial,
            has_migrated_preferred_microphone = excluded.has_migrated_preferred_microphone,
            cohort = excluded.cohort,
            styling_mode = excluded.styling_mode",
    )
    .bind(&user.id)
    .bind(&user.name)
    .bind(&user.bio)
    .bind(&user.company)
    .bind(&user.title)
    .bind(if user.onboarded { 1 } else { 0 })
    .bind(&user.preferred_microphone)
    .bind(&user.preferred_language)
    .bind(&user.words_this_month)
    .bind(&user.words_this_month_month)
    .bind(&user.words_total)
    .bind(if user.play_interaction_chime { 1 } else { 0 })
    .bind(if user.has_finished_tutorial { 1 } else { 0 })
    .bind(if user.has_migrated_preferred_microphone { 1 } else { 0 })
    .bind(&user.cohort)
    .bind(&user.styling_mode)
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
            company,
            title,
            onboarded,
            preferred_microphone,
            preferred_language,
            words_this_month,
            words_this_month_month,
            words_total,
            play_interaction_chime,
            has_finished_tutorial,
            has_migrated_preferred_microphone,
            cohort,
            styling_mode
         FROM user_profiles
         LIMIT 1",
    )
    .fetch_optional(&pool)
    .await?;

    let user = match row {
        Some(row) => {
            let onboarded_raw = row.get::<i64, _>("onboarded");
            let play_interaction_raw = row.try_get::<i64, _>("play_interaction_chime").unwrap_or(1);
            let tutorial_finished_raw = row
                .try_get::<i64, _>("has_finished_tutorial")
                .unwrap_or(0);
            let migrated_microphone_raw = row
                .try_get::<i64, _>("has_migrated_preferred_microphone")
                .unwrap_or(0);
            Some(User {
                id: row.get::<String, _>("id"),
                name: row.get::<String, _>("name"),
                bio: row.get::<String, _>("bio"),
                company: row.try_get::<Option<String>, _>("company").unwrap_or(None),
                title: row.try_get::<Option<String>, _>("title").unwrap_or(None),
                onboarded: onboarded_raw != 0,
                preferred_microphone: row.get::<Option<String>, _>("preferred_microphone"),
                preferred_language: row.get::<Option<String>, _>("preferred_language"),
                words_this_month: row.try_get::<i64, _>("words_this_month").unwrap_or(0),
                words_this_month_month: row
                    .try_get::<Option<String>, _>("words_this_month_month")
                    .unwrap_or(None),
                words_total: row.try_get::<i64, _>("words_total").unwrap_or(0),
                play_interaction_chime: play_interaction_raw != 0,
                has_finished_tutorial: tutorial_finished_raw != 0,
                has_migrated_preferred_microphone: migrated_microphone_raw != 0,
                cohort: row.try_get::<Option<String>, _>("cohort").unwrap_or(None),
                styling_mode: row.try_get::<Option<String>, _>("styling_mode").unwrap_or(None),
            })
        }
        None => None,
    };

    Ok(user)
}
