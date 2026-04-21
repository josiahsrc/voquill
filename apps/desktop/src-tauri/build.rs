use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    bake_flavor_env();
    tauri_build::build()
}

fn bake_flavor_env() {
    println!("cargo:rerun-if-env-changed=FLAVOR");
    println!("cargo:rerun-if-env-changed=VITE_FLAVOR");

    let flavor = env::var("FLAVOR")
        .or_else(|_| env::var("VITE_FLAVOR"))
        .unwrap_or_else(|_| "dev".to_string());

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let env_file = manifest_dir
        .parent()
        .map(|p| p.join(format!(".env.{flavor}")))
        .expect("CARGO_MANIFEST_DIR has no parent");

    println!("cargo:rerun-if-changed={}", env_file.display());

    let contents = match fs::read_to_string(&env_file) {
        Ok(c) => c,
        Err(err) => {
            println!(
                "cargo:warning=flavor env file {} not readable: {err}",
                env_file.display()
            );
            return;
        }
    };

    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let Some((key, value)) = trimmed.split_once('=') else {
            continue;
        };
        let key = key.trim();
        let value = strip_quotes(value.trim());
        if key.is_empty() {
            continue;
        }
        println!("cargo:rustc-env={key}={value}");
    }
}

fn strip_quotes(value: &str) -> &str {
    let bytes = value.as_bytes();
    if bytes.len() >= 2
        && ((bytes[0] == b'"' && bytes[bytes.len() - 1] == b'"')
            || (bytes[0] == b'\'' && bytes[bytes.len() - 1] == b'\''))
    {
        &value[1..value.len() - 1]
    } else {
        value
    }
}
