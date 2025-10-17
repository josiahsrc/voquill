use tauri::State;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

#[tauri::command]
pub async fn user_set_one(
    user: crate::domain::User,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<crate::domain::User, String> {
    crate::db::user_queries::upsert_user(database.pool(), &user)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn user_get_one(
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<Option<crate::domain::User>, String> {
    crate::db::user_queries::fetch_user(database.pool())
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn transcription_create(
    transcription: crate::domain::Transcription,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<crate::domain::Transcription, String> {
    crate::db::transcription_queries::insert_transcription(database.pool(), &transcription)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn get_option_key_count(
    counter: State<'_, crate::state::OptionKeyCounter>,
    database: State<'_, crate::state::OptionKeyDatabase>,
) -> Result<u64, String> {
    match crate::db::queries::fetch_count(database.pool()).await {
        Ok(count) => {
            counter.store(count);
            Ok(count)
        }
        Err(err) => {
            eprintln!("db read failed: {err}");
            Ok(counter.load())
        }
    }
}
