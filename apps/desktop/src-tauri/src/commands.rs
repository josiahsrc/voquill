use tauri::State;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
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
