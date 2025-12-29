use std::{env, path::PathBuf};

const DEFAULT_FLAVOR: &str = "dev";

pub fn load_flavor_env() {
    let flavor = env::var("FLAVOR")
        .or_else(|_| env::var("VITE_FLAVOR"))
        .unwrap_or_else(|_| DEFAULT_FLAVOR.to_string());

    // Try loading from bundled resources first (for production builds),
    // then fall back to source directory (for development).
    let search_dirs = get_env_search_dirs();

    for dir in &search_dirs {
        if load_env_for_flavor(dir, &flavor) {
            return;
        }
    }

    // If requested flavor not found, try default flavor as fallback
    if flavor != DEFAULT_FLAVOR {
        for dir in &search_dirs {
            if load_env_for_flavor(dir, DEFAULT_FLAVOR) {
                return;
            }
        }
    }
}

/// Returns directories to search for .env files, in priority order.
fn get_env_search_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    // 1. Try resource directory relative to executable (production builds)
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // macOS: Resources are in ../Resources relative to the binary
            #[cfg(target_os = "macos")]
            {
                let resources_dir = exe_dir.join("../Resources");
                if resources_dir.exists() {
                    dirs.push(resources_dir);
                }
            }

            // Windows/Linux: Resources are in the same directory as the executable
            #[cfg(not(target_os = "macos"))]
            {
                dirs.push(exe_dir.to_path_buf());
            }
        }
    }

    // 2. Fall back to source directory (development builds)
    // CARGO_MANIFEST_DIR is apps/desktop/src-tauri, parent is apps/desktop
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(desktop_dir) = manifest_dir.parent() {
        dirs.push(desktop_dir.to_path_buf());
    }

    dirs
}

fn load_env_for_flavor(base_dir: &PathBuf, flavor: &str) -> bool {
    let env_file = base_dir.join(format!(".env.{flavor}"));
    if !env_file.exists() {
        return false;
    }

    eprintln!("[flavor_env] Loading {}", env_file.display());
    if let Err(err) = dotenvy::from_path(&env_file) {
        eprintln!("[flavor_env] Unable to load {}: {err}", env_file.display());
    }

    true
}
