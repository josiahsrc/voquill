use base64::{engine::general_purpose, Engine as _};
use rand::{rngs::OsRng, RngCore};
use sha2::{Digest, Sha256};
use std::sync::OnceLock;

const SECRET_ENV: &str = "VOQUILL_API_KEY_SECRET";
const DEFAULT_SECRET: &str = "voquill-default-secret";
static RUNTIME_SECRET: OnceLock<Vec<u8>> = OnceLock::new();
static LOGGED_FALLBACK: OnceLock<()> = OnceLock::new();

pub struct ProtectedApiKey {
    pub salt_b64: String,
    pub hash_b64: String,
    pub ciphertext_b64: String,
    pub key_suffix: Option<String>,
}

pub fn runtime_secret() -> &'static [u8] {
    RUNTIME_SECRET
        .get_or_init(|| match std::env::var(SECRET_ENV) {
            Ok(value) if !value.is_empty() => value.into_bytes(),
            _ => {
                LOGGED_FALLBACK.get_or_init(|| {
                    eprintln!(
                        "{SECRET_ENV} not set; falling back to default secret. Set this \
                         environment variable to secure stored API keys."
                    );
                });
                DEFAULT_SECRET.as_bytes().to_vec()
            }
        })
        .as_slice()
}

pub fn protect_api_key(key: &str) -> ProtectedApiKey {
    let secret = runtime_secret();
    let salt = generate_salt();
    let salt_b64 = general_purpose::STANDARD.encode(salt);
    let hash = hash_key(secret, &salt, key.as_bytes());
    let ciphertext = encrypt_key(secret, &salt, key.as_bytes());

    ProtectedApiKey {
        salt_b64,
        hash_b64: general_purpose::STANDARD.encode(hash),
        ciphertext_b64: general_purpose::STANDARD.encode(ciphertext),
        key_suffix: compute_key_suffix(key),
    }
}

pub fn reveal_api_key(salt_b64: &str, ciphertext_b64: &str) -> Result<String, CryptoError> {
    let salt = general_purpose::STANDARD
        .decode(salt_b64)
        .map_err(|err| CryptoError::Base64(err.to_string()))?;
    let ciphertext = general_purpose::STANDARD
        .decode(ciphertext_b64)
        .map_err(|err| CryptoError::Base64(err.to_string()))?;
    let secret = runtime_secret();
    let plaintext = decrypt_key(secret, &salt, &ciphertext);
    String::from_utf8(plaintext).map_err(|err| CryptoError::InvalidUtf8(err.to_string()))
}

#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("invalid base64 data: {0}")]
    Base64(String),
    #[error("stored API key is not valid UTF-8: {0}")]
    InvalidUtf8(String),
}

fn generate_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    salt
}

fn hash_key(secret: &[u8], salt: &[u8], key: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(secret);
    hasher.update(salt);
    hasher.update(key);
    hasher.finalize().into()
}

fn encrypt_key(secret: &[u8], salt: &[u8], key: &[u8]) -> Vec<u8> {
    xor_keystream(secret, salt, key)
}

fn decrypt_key(secret: &[u8], salt: &[u8], ciphertext: &[u8]) -> Vec<u8> {
    xor_keystream(secret, salt, ciphertext)
}

fn xor_keystream(secret: &[u8], salt: &[u8], data: &[u8]) -> Vec<u8> {
    let keystream = derive_keystream(secret, salt, data.len());
    data.iter()
        .zip(keystream.iter())
        .map(|(byte, key_byte)| byte ^ key_byte)
        .collect()
}

fn derive_keystream(secret: &[u8], salt: &[u8], length: usize) -> Vec<u8> {
    let mut keystream = Vec::with_capacity(length);
    let mut counter: u32 = 0;

    while keystream.len() < length {
        let mut hasher = Sha256::new();
        hasher.update(secret);
        hasher.update(salt);
        hasher.update(counter.to_be_bytes());
        let block = hasher.finalize();
        keystream.extend_from_slice(&block);
        counter = counter.wrapping_add(1);
    }

    keystream.truncate(length);
    keystream
}

fn compute_key_suffix(key: &str) -> Option<String> {
    let mut chars = key.chars();
    let mut buffer = Vec::new();

    while let Some(ch) = chars.next_back() {
        buffer.push(ch);
        if buffer.len() == 4 {
            break;
        }
    }

    if buffer.is_empty() {
        None
    } else {
        buffer.reverse();
        Some(buffer.into_iter().collect())
    }
}
