use sqlx::{Row, SqlitePool};

use crate::domain::Hotkey;

fn serialize_keys(keys: &[String]) -> Result<String, sqlx::Error> {
    serde_json::to_string(keys).map_err(|err| sqlx::Error::Decode(Box::new(err)))
}

fn deserialize_keys(keys: String) -> Result<Vec<String>, sqlx::Error> {
    serde_json::from_str(&keys).map_err(|err| sqlx::Error::Decode(Box::new(err)))
}

pub async fn upsert_hotkey(pool: SqlitePool, hotkey: &Hotkey) -> Result<Hotkey, sqlx::Error> {
    let keys_json = serialize_keys(&hotkey.keys)?;

    sqlx::query(
        "INSERT INTO hotkeys (id, action_name, keys)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET action_name = excluded.action_name, keys = excluded.keys",
    )
    .bind(&hotkey.id)
    .bind(&hotkey.action_name)
    .bind(keys_json)
    .execute(&pool)
    .await?;

    Ok(hotkey.clone())
}

pub async fn fetch_hotkeys(pool: SqlitePool) -> Result<Vec<Hotkey>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, action_name, keys
         FROM hotkeys
         ORDER BY action_name ASC, id ASC",
    )
    .fetch_all(&pool)
    .await?;

    rows.into_iter()
        .map(|row| {
            let keys_json = row.get::<String, _>("keys");
            let keys = deserialize_keys(keys_json)?;
            Ok(Hotkey {
                id: row.get::<String, _>("id"),
                action_name: row.get::<String, _>("action_name"),
                keys,
            })
        })
        .collect()
}
