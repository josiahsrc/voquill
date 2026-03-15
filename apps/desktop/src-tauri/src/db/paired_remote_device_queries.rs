use sqlx::{Row, SqlitePool};

use crate::domain::PairedRemoteDevice;

pub async fn upsert_paired_remote_device(
    pool: SqlitePool,
    device: &PairedRemoteDevice,
) -> Result<PairedRemoteDevice, sqlx::Error> {
    sqlx::query(
        "INSERT INTO paired_remote_devices (
            id,
            name,
            platform,
            role,
            shared_secret,
            paired_at,
            last_seen_at,
            last_known_address,
            trusted
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            platform = excluded.platform,
            role = excluded.role,
            shared_secret = excluded.shared_secret,
            paired_at = excluded.paired_at,
            last_seen_at = excluded.last_seen_at,
            last_known_address = excluded.last_known_address,
            trusted = excluded.trusted",
    )
    .bind(&device.id)
    .bind(&device.name)
    .bind(&device.platform)
    .bind(&device.role)
    .bind(&device.shared_secret)
    .bind(&device.paired_at)
    .bind(&device.last_seen_at)
    .bind(&device.last_known_address)
    .bind(device.trusted)
    .execute(&pool)
    .await?;

    Ok(device.clone())
}

pub async fn fetch_paired_remote_devices(
    pool: SqlitePool,
) -> Result<Vec<PairedRemoteDevice>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT
            id,
            name,
            platform,
            role,
            shared_secret,
            paired_at,
            last_seen_at,
            last_known_address,
            trusted
         FROM paired_remote_devices
         ORDER BY paired_at DESC",
    )
    .fetch_all(&pool)
    .await?;

    let mut devices = Vec::with_capacity(rows.len());
    for row in rows {
        devices.push(PairedRemoteDevice {
            id: row.get("id"),
            name: row.get("name"),
            platform: row.get("platform"),
            role: row.get("role"),
            shared_secret: row.get("shared_secret"),
            paired_at: row.get("paired_at"),
            last_seen_at: row.try_get("last_seen_at")?,
            last_known_address: row.try_get("last_known_address")?,
            trusted: row
                .try_get::<i64, _>("trusted")
                .map(|value| value != 0)
                .unwrap_or(true),
        });
    }

    Ok(devices)
}

pub async fn fetch_paired_remote_device_by_id(
    pool: SqlitePool,
    id: &str,
) -> Result<Option<PairedRemoteDevice>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT
            id,
            name,
            platform,
            role,
            shared_secret,
            paired_at,
            last_seen_at,
            last_known_address,
            trusted
         FROM paired_remote_devices
         WHERE id = ?1
         LIMIT 1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?;

    Ok(row.map(|row| PairedRemoteDevice {
        id: row.get("id"),
        name: row.get("name"),
        platform: row.get("platform"),
        role: row.get("role"),
        shared_secret: row.get("shared_secret"),
        paired_at: row.get("paired_at"),
        last_seen_at: row.try_get("last_seen_at").unwrap_or(None),
        last_known_address: row.try_get("last_known_address").unwrap_or(None),
        trusted: row
            .try_get::<i64, _>("trusted")
            .map(|value| value != 0)
            .unwrap_or(true),
    }))
}

pub async fn delete_paired_remote_device(pool: SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM paired_remote_devices WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await?;

    Ok(())
}
