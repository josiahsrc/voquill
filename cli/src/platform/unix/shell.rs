use portable_pty::CommandBuilder;

pub fn build_command(command: &[String]) -> CommandBuilder {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
    let joined = command
        .iter()
        .map(|arg| shell_quote(arg))
        .collect::<Vec<_>>()
        .join(" ");
    let mut cmd = CommandBuilder::new(shell);
    cmd.arg("-ic");
    cmd.arg(joined);
    if let Ok(cwd) = std::env::current_dir() {
        cmd.cwd(cwd);
    }
    cmd
}

fn shell_quote(arg: &str) -> String {
    if !arg.is_empty()
        && arg.bytes().all(|b| {
            b.is_ascii_alphanumeric()
                || matches!(
                    b,
                    b'_' | b'-' | b'.' | b'/' | b':' | b'=' | b',' | b'@' | b'+'
                )
        })
    {
        return arg.to_string();
    }
    let escaped = arg.replace('\'', "'\\''");
    format!("'{escaped}'")
}
