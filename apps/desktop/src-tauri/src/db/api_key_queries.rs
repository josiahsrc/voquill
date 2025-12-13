use sqlx::{Row, SqlitePool};

use crate::domain::{ApiKey, ApiKeyUpdateRequest};

pub async fn insert_api_key(pool: SqlitePool, api_key: &ApiKey) -> Result<ApiKey, sqlx::Error> {
    sqlx::query(
        "INSERT INTO api_keys (id, name, provider, created_at, salt, key_hash, key_ciphertext, key_suffix, transcription_model, post_processing_model)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
    )
    .bind(&api_key.id)
    .bind(&api_key.name)
    .bind(&api_key.provider)
    .bind(api_key.created_at)
    .bind(&api_key.salt)
    .bind(&api_key.key_hash)
    .bind(&api_key.key_ciphertext)
    .bind(&api_key.key_suffix)
    .bind(&api_key.transcription_model)
    .bind(&api_key.post_processing_model)
    .execute(&pool)
    .await?;

    Ok(api_key.clone())
}

pub async fn fetch_api_keys(pool: SqlitePool) -> Result<Vec<ApiKey>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, name, provider, created_at, salt, key_hash, key_ciphertext, key_suffix, transcription_model, post_processing_model
         FROM api_keys
         ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await?;

    let api_keys = rows
        .into_iter()
        .map(|row| ApiKey {
            id: row.get::<String, _>("id"),
            name: row.get::<String, _>("name"),
            provider: row.get::<String, _>("provider"),
            created_at: row.get::<i64, _>("created_at"),
            salt: row.get::<String, _>("salt"),
            key_hash: row.get::<String, _>("key_hash"),
            key_ciphertext: row.get::<String, _>("key_ciphertext"),
            key_suffix: row.get::<Option<String>, _>("key_suffix"),
            transcription_model: row.get::<Option<String>, _>("transcription_model"),
            post_processing_model: row.get::<Option<String>, _>("post_processing_model"),
        })
        .collect();

    Ok(api_keys)
}

pub async fn update_api_key(pool: SqlitePool, request: &ApiKeyUpdateRequest) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE api_keys SET transcription_model = ?2, post_processing_model = ?3 WHERE id = ?1",
    )
    .bind(&request.id)
    .bind(&request.transcription_model)
    .bind(&request.post_processing_model)
    .execute(&pool)
    .await?;

    Ok(())
}

pub async fn delete_api_key(pool: SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM api_keys
         WHERE id = ?1",
    )
    .bind(id)
    .execute(&pool)
    .await?;

    Ok(())
}
