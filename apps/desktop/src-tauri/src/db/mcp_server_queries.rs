use sqlx::{Row, SqlitePool};

use crate::domain::{McpServer, McpServerUpdateRequest};

pub async fn insert_mcp_server(pool: SqlitePool, server: &McpServer) -> Result<McpServer, sqlx::Error> {
    sqlx::query(
        "INSERT INTO mcp_servers (id, provider, name, url, enabled, created_at, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, salt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
    )
    .bind(&server.id)
    .bind(&server.provider)
    .bind(&server.name)
    .bind(&server.url)
    .bind(server.enabled)
    .bind(server.created_at)
    .bind(&server.access_token_ciphertext)
    .bind(&server.refresh_token_ciphertext)
    .bind(server.token_expires_at)
    .bind(&server.salt)
    .execute(&pool)
    .await?;

    Ok(server.clone())
}

pub async fn fetch_mcp_servers(pool: SqlitePool) -> Result<Vec<McpServer>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, provider, name, url, enabled, created_at, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, salt
         FROM mcp_servers
         ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await?;

    let servers = rows
        .into_iter()
        .map(|row| McpServer {
            id: row.get::<String, _>("id"),
            provider: row.get::<String, _>("provider"),
            name: row.get::<String, _>("name"),
            url: row.get::<String, _>("url"),
            enabled: row.get::<bool, _>("enabled"),
            created_at: row.get::<i64, _>("created_at"),
            access_token_ciphertext: row.get::<Option<String>, _>("access_token_ciphertext"),
            refresh_token_ciphertext: row.get::<Option<String>, _>("refresh_token_ciphertext"),
            token_expires_at: row.get::<Option<i64>, _>("token_expires_at"),
            salt: row.get::<Option<String>, _>("salt"),
        })
        .collect();

    Ok(servers)
}

pub async fn fetch_mcp_server_by_id(pool: SqlitePool, id: &str) -> Result<Option<McpServer>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT id, provider, name, url, enabled, created_at, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, salt
         FROM mcp_servers
         WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?;

    Ok(row.map(|row| McpServer {
        id: row.get::<String, _>("id"),
        provider: row.get::<String, _>("provider"),
        name: row.get::<String, _>("name"),
        url: row.get::<String, _>("url"),
        enabled: row.get::<bool, _>("enabled"),
        created_at: row.get::<i64, _>("created_at"),
        access_token_ciphertext: row.get::<Option<String>, _>("access_token_ciphertext"),
        refresh_token_ciphertext: row.get::<Option<String>, _>("refresh_token_ciphertext"),
        token_expires_at: row.get::<Option<i64>, _>("token_expires_at"),
        salt: row.get::<Option<String>, _>("salt"),
    }))
}

pub async fn update_mcp_server(pool: SqlitePool, request: &McpServerUpdateRequest) -> Result<(), sqlx::Error> {
    let mut query_parts = vec![];
    let mut has_updates = false;

    if request.name.is_some() {
        query_parts.push("name = ?2");
        has_updates = true;
    }
    if request.enabled.is_some() {
        query_parts.push("enabled = ?3");
        has_updates = true;
    }

    if !has_updates {
        return Ok(());
    }

    let query = format!(
        "UPDATE mcp_servers SET {} WHERE id = ?1",
        query_parts.join(", ")
    );

    sqlx::query(&query)
        .bind(&request.id)
        .bind(&request.name)
        .bind(request.enabled)
        .execute(&pool)
        .await?;

    Ok(())
}

pub async fn update_mcp_server_tokens(
    pool: SqlitePool,
    id: &str,
    access_token_ciphertext: &str,
    refresh_token_ciphertext: Option<&str>,
    token_expires_at: Option<i64>,
    salt: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE mcp_servers SET access_token_ciphertext = ?2, refresh_token_ciphertext = ?3, token_expires_at = ?4, salt = ?5 WHERE id = ?1",
    )
    .bind(id)
    .bind(access_token_ciphertext)
    .bind(refresh_token_ciphertext)
    .bind(token_expires_at)
    .bind(salt)
    .execute(&pool)
    .await?;

    Ok(())
}

pub async fn delete_mcp_server(pool: SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM mcp_servers WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await?;

    Ok(())
}
