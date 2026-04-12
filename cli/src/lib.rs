pub mod auth;
pub mod commands;
pub mod credentials;
pub mod random_name;
pub mod rtdb;
pub mod workspace;

use anyhow::Result;
use clap::{Parser, Subcommand};

#[derive(Copy, Clone, Debug)]
pub enum Env {
    Prod,
    Dev,
    Emulator,
}

impl Env {
    pub fn as_str(self) -> &'static str {
        match self {
            Env::Prod => "prod",
            Env::Dev => "dev",
            Env::Emulator => "emulator",
        }
    }

    pub fn default_site(self) -> &'static str {
        match self {
            Env::Prod => "https://voquill.com",
            Env::Dev | Env::Emulator => "http://localhost:4321",
        }
    }

    pub fn api_key(self) -> &'static str {
        match self {
            Env::Prod => "AIzaSyDZV0yVGw8lzyZcQFEVQe9SbgFtXH2Tv94",
            Env::Dev | Env::Emulator => "AIzaSyAteG4sQc4z6nJcHZ2oX5fsUAYqHzM6IAE",
        }
    }

    pub fn secure_token_url(self) -> String {
        match self {
            Env::Prod | Env::Dev => format!(
                "https://securetoken.googleapis.com/v1/token?key={}",
                self.api_key()
            ),
            Env::Emulator => format!(
                "http://127.0.0.1:9099/securetoken.googleapis.com/v1/token?key={}",
                self.api_key()
            ),
        }
    }
}

#[derive(Parser)]
#[command(version, about = "Voquill CLI")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Sign in via the browser.
    Login {
        /// Origin of the site hosting the authorize page (default per binary).
        #[arg(long)]
        site: Option<String>,
    },
    /// Remove stored credentials for this environment.
    Logout,
    /// Wrap an agent command in a Voquill session.
    Agent {
        /// Command (and args) to run inside the session.
        #[arg(trailing_var_arg = true, required = true, allow_hyphen_values = true)]
        command: Vec<String>,
    },
}

pub fn run(env: Env) -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Login { site } => commands::login::run(env, site),
        Command::Logout => commands::logout::run(env),
        Command::Agent { command } => commands::agent::run(env, command),
    }
}
