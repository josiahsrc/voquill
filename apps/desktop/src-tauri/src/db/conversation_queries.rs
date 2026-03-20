use sqlx::{Row, SqlitePool};

use crate::domain::Conversation;

pub async fn insert_conversation(
    pool: SqlitePool,
    conversation: &Conversation,
) -> Result<Conversation, sqlx::Error> {
    sqlx::query(
        "INSERT INTO conversations (id, title, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&conversation.id)
    .bind(&conversation.title)
    .bind(conversation.created_at)
    .bind(conversation.updated_at)
    .execute(&pool)
    .await?;

    Ok(conversation.clone())
}

pub async fn fetch_conversations(pool: SqlitePool) -> Result<Vec<Conversation>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, title, created_at, updated_at
         FROM conversations
         ORDER BY updated_at DESC",
    )
    .fetch_all(&pool)
    .await?;

    let conversations = rows
        .into_iter()
        .map(|row| Conversation {
            id: row.get::<String, _>("id"),
            title: row.get::<String, _>("title"),
            created_at: row.get::<i64, _>("created_at"),
            updated_at: row.get::<i64, _>("updated_at"),
        })
        .collect();

    Ok(conversations)
}

pub async fn update_conversation(
    pool: SqlitePool,
    conversation: &Conversation,
) -> Result<Conversation, sqlx::Error> {
    sqlx::query(
        "UPDATE conversations SET title = ?2, updated_at = ?3 WHERE id = ?1",
    )
    .bind(&conversation.id)
    .bind(&conversation.title)
    .bind(conversation.updated_at)
    .execute(&pool)
    .await?;

    Ok(conversation.clone())
}

pub async fn delete_conversation(pool: SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM chat_messages WHERE conversation_id = ?1")
        .bind(id)
        .execute(&pool)
        .await?;

    sqlx::query("DELETE FROM conversations WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await?;

    Ok(())
}
