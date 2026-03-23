mod ipc;
mod pill;

fn main() {
    gtk4::init().expect("Failed to initialize GTK4");
    let (sender, receiver) = std::sync::mpsc::channel();
    ipc::start_stdin_reader(sender);
    pill::run(receiver);
}
