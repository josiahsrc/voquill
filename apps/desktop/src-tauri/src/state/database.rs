use sqlx::SqlitePool;

#[derive(Clone)]
pub struct OptionKeyDatabase(SqlitePool);

impl OptionKeyDatabase {
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub fn pool(&self) -> SqlitePool {
        self.0.clone()
    }
}
