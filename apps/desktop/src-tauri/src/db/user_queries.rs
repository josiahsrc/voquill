use sqlx::{Row, SqlitePool};

use crate::domain::User;

pub async fn upsert_user(pool: SqlitePool, user: &User) -> Result<User, sqlx::Error> {
    sqlx::query(
        "INSERT INTO user_profiles (id, name, bio, onboarded)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            bio = excluded.bio,
            onboarded = excluded.onboarded",
    )
    .bind(&user.id)
    .bind(&user.name)
    .bind(&user.bio)
    .bind(if user.onboarded { 1 } else { 0 })
    .execute(&pool)
    .await?;

    Ok(user.clone())
}

pub async fn fetch_user(pool: SqlitePool) -> Result<Option<User>, sqlx::Error> {
    let row = sqlx::query("SELECT id, name, bio, onboarded FROM user_profiles LIMIT 1")
        .fetch_optional(&pool)
        .await?;

    let user = match row {
        Some(row) => {
            let onboarded_raw = row.get::<i64, _>("onboarded");
            Some(User {
                id: row.get::<String, _>("id"),
                name: row.get::<String, _>("name"),
                bio: row.get::<String, _>("bio"),
                onboarded: onboarded_raw != 0,
            })
        }
        None => None,
    };

    Ok(user)
}
