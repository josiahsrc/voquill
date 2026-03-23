mod ipc;
mod pill;

fn main() {
    gtk::init().expect("Failed to initialize GTK");
    let (sender, receiver) = std::sync::mpsc::channel();
    ipc::start_stdin_reader(sender);
    pill::run(receiver);
}
