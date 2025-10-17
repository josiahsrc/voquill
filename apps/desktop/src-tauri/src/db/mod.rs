pub mod queries;
pub mod user_queries;

pub const DB_FILENAME: &str = "voquill.db";
pub const DB_CONNECTION: &str = "sqlite:voquill.db";

pub const SCHEMA_SQL: &str = include_str!("migrations/000_schema.sql");
pub const USER_PROFILES_MIGRATION_SQL: &str = include_str!("migrations/001_user_profiles.sql");

pub fn migrations() -> Vec<tauri_plugin_sql::Migration> {
    vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "create_users_table",
            sql: SCHEMA_SQL,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            description: "create_user_profiles_table",
            sql: USER_PROFILES_MIGRATION_SQL,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}
