use std::{env, path::Path};

const DEFAULT_FLAVOR: &str = "dev";

pub fn load_flavor_env() {
    let flavor = env::var("FLAVOR")
        .or_else(|_| env::var("VITE_FLAVOR"))
        .unwrap_or_else(|_| DEFAULT_FLAVOR.to_string());

    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    if let Some(desktop_dir) = manifest_dir.parent() {
        if load_env_for_flavor(desktop_dir, &flavor) {
            return;
        }

        if flavor != DEFAULT_FLAVOR {
            let fallback_flavor = DEFAULT_FLAVOR;
            load_env_for_flavor(desktop_dir, fallback_flavor);
        }
    }
}

fn load_env_for_flavor(base_dir: &Path, flavor: &str) -> bool {
    let env_file = base_dir.join(format!(".env.{flavor}"));
    if !env_file.exists() {
        return false;
    }

    if let Err(err) = dotenvy::from_path(&env_file) {
        eprintln!("Unable to load {}: {err}", env_file.display());
    }

    true
}
