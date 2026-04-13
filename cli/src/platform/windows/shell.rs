use portable_pty::CommandBuilder;

pub fn build_command(command: &[String]) -> CommandBuilder {
    let shell = std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string());
    let joined = command.join(" ");
    let mut cmd = CommandBuilder::new(shell);
    cmd.arg("/c");
    cmd.arg(joined);
    cmd
}
