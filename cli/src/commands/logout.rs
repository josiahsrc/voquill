use anyhow::{Context, Result};

use crate::Env;
use crate::credentials;

pub fn run(env: Env) -> Result<()> {
    let path = credentials::credentials_path(env)?;

    match std::fs::remove_file(&path) {
        Ok(()) => {
            println!("Signed out. Removed {}", path.display());
            Ok(())
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            println!("Not signed in.");
            Ok(())
        }
        Err(err) => Err(err).with_context(|| format!("Failed to remove {}", path.display())),
    }
}
