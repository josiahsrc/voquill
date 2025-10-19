pub mod hotkey_queries;
pub mod term_queries;
pub mod transcription_queries;
pub mod user_queries;

pub const DB_FILENAME: &str = "voquill.db";
pub const DB_CONNECTION: &str = "sqlite:voquill.db";

pub const SCHEMA_SQL: &str = include_str!("migrations/000_schema.sql");
pub const USER_PROFILES_MIGRATION_SQL: &str = include_str!("migrations/001_user_profiles.sql");
pub const TRANSCRIPTIONS_MIGRATION_SQL: &str = include_str!("migrations/002_transcriptions.sql");
pub const TERMS_MIGRATION_SQL: &str = include_str!("migrations/003_terms.sql");
pub const HOTKEYS_MIGRATION_SQL: &str = include_str!("migrations/004_hotkeys.sql");
pub const DROP_USERS_MIGRATION_SQL: &str = include_str!("migrations/005_drop_users.sql");
pub const USER_PREFERRED_MICROPHONE_MIGRATION_SQL: &str =
    include_str!("migrations/006_user_preferred_microphone.sql");

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
        tauri_plugin_sql::Migration {
            version: 3,
            description: "create_transcriptions_table",
            sql: TRANSCRIPTIONS_MIGRATION_SQL,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 4,
            description: "create_terms_table",
            sql: TERMS_MIGRATION_SQL,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 5,
            description: "create_hotkeys_table",
            sql: HOTKEYS_MIGRATION_SQL,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 6,
            description: "drop_users_table",
            sql: DROP_USERS_MIGRATION_SQL,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 7,
            description: "add_user_preferred_microphone",
            sql: USER_PREFERRED_MICROPHONE_MIGRATION_SQL,
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}
