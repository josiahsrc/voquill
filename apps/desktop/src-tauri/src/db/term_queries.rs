use sqlx::{Row, SqlitePool};

use crate::domain::Term;

pub async fn insert_term(pool: SqlitePool, term: &Term) -> Result<Term, sqlx::Error> {
    sqlx::query(
        "INSERT INTO terms (id, created_at, created_by_user_id, source_value, destination_value, is_replacement, is_deleted)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(&term.id)
    .bind(term.created_at)
    .bind(&term.created_by_user_id)
    .bind(&term.source_value)
    .bind(&term.destination_value)
    .bind(term.is_replacement as i64)
    .bind(term.is_deleted as i64)
    .execute(&pool)
    .await?;

    Ok(term.clone())
}

pub async fn fetch_terms(pool: SqlitePool) -> Result<Vec<Term>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, created_at, created_by_user_id, source_value, destination_value, is_replacement, is_deleted
         FROM terms
         WHERE is_deleted = 0
         ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await?;

    let terms = rows
        .into_iter()
        .map(|row| Term {
            id: row.get::<String, _>("id"),
            created_at: row.get::<i64, _>("created_at"),
            created_by_user_id: row.get::<String, _>("created_by_user_id"),
            source_value: row.get::<String, _>("source_value"),
            destination_value: row.get::<String, _>("destination_value"),
            is_replacement: row.get::<i64, _>("is_replacement") != 0,
            is_deleted: row.get::<i64, _>("is_deleted") != 0,
        })
        .collect();

    Ok(terms)
}

pub async fn update_term(pool: SqlitePool, term: &Term) -> Result<Term, sqlx::Error> {
    sqlx::query(
        "UPDATE terms
         SET source_value = ?2,
             destination_value = ?3,
             is_replacement = ?4,
             is_deleted = ?5
         WHERE id = ?1",
    )
    .bind(&term.id)
    .bind(&term.source_value)
    .bind(&term.destination_value)
    .bind(term.is_replacement as i64)
    .bind(term.is_deleted as i64)
    .execute(&pool)
    .await?;

    Ok(term.clone())
}

pub async fn delete_term(pool: SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE terms
         SET is_deleted = 1
         WHERE id = ?1",
    )
    .bind(id)
    .execute(&pool)
    .await?;

    Ok(())
}
