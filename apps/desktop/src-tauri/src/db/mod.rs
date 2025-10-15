pub mod queries;

pub const DB_FILENAME: &str = "voquill.db";
pub const DB_CONNECTION: &str = "sqlite:voquill.db";
pub const SCHEMA_SQL: &str = include_str!("schema.sql");

pub fn migrations() -> Vec<tauri_plugin_sql::Migration> {
    vec![tauri_plugin_sql::Migration {
        version: 1,
        description: "create_users_table",
        sql: SCHEMA_SQL,
        kind: tauri_plugin_sql::MigrationKind::Up,
    }]
}
