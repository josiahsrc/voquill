use portable_pty::CommandBuilder;

pub fn host_description() -> String {
    let shell = std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string());
    let shell_name = shell
        .rsplit(['\\', '/'])
        .next()
        .unwrap_or(&shell)
        .to_lowercase();
    format!("Windows (shell: {shell_name})")
}

pub fn build_command(command: &[String]) -> CommandBuilder {
    let shell = std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string());
    let joined = command.join(" ");
    let mut cmd = CommandBuilder::new(shell);
    cmd.arg("/c");
    cmd.arg(joined);
    if let Ok(cwd) = std::env::current_dir() {
        cmd.cwd(cwd);
    }
    cmd
}
