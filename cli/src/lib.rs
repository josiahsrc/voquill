pub mod commands;
pub mod credentials;

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
}

pub fn run(env: Env) -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Login { site } => commands::login::run(env, site),
        Command::Logout => commands::logout::run(env),
    }
}
