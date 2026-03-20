use sqlx::{Row, SqlitePool};

use crate::domain::ChatMessage;

pub async fn insert_chat_message(
    pool: SqlitePool,
    message: &ChatMessage,
) -> Result<ChatMessage, sqlx::Error> {
    sqlx::query(
        "INSERT INTO chat_messages (id, conversation_id, role, content, created_at, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&message.id)
    .bind(&message.conversation_id)
    .bind(&message.role)
    .bind(&message.content)
    .bind(message.created_at)
    .bind(&message.metadata)
    .execute(&pool)
    .await?;

    Ok(message.clone())
}

pub async fn fetch_chat_messages_by_conversation(
    pool: SqlitePool,
    conversation_id: &str,
) -> Result<Vec<ChatMessage>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, conversation_id, role, content, created_at, metadata
         FROM chat_messages
         WHERE conversation_id = ?1
         ORDER BY created_at ASC",
    )
    .bind(conversation_id)
    .fetch_all(&pool)
    .await?;

    let messages = rows
        .into_iter()
        .map(|row| ChatMessage {
            id: row.get::<String, _>("id"),
            conversation_id: row.get::<String, _>("conversation_id"),
            role: row.get::<String, _>("role"),
            content: row.get::<String, _>("content"),
            created_at: row.get::<i64, _>("created_at"),
            metadata: row.get::<Option<String>, _>("metadata"),
        })
        .collect();

    Ok(messages)
}

pub async fn update_chat_message(
    pool: SqlitePool,
    message: &ChatMessage,
) -> Result<ChatMessage, sqlx::Error> {
    sqlx::query(
        "UPDATE chat_messages SET content = ?2, metadata = ?3 WHERE id = ?1",
    )
    .bind(&message.id)
    .bind(&message.content)
    .bind(&message.metadata)
    .execute(&pool)
    .await?;

    Ok(message.clone())
}

pub async fn delete_chat_messages(
    pool: SqlitePool,
    ids: &[String],
) -> Result<(), sqlx::Error> {
    for id in ids {
        sqlx::query("DELETE FROM chat_messages WHERE id = ?1")
            .bind(id)
            .execute(&pool)
            .await?;
    }

    Ok(())
}
