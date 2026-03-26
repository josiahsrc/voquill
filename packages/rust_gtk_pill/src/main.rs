mod constants;
mod draw;
mod input;
mod ipc;
mod pill;
mod state;
mod x11;

fn main() {
    gtk::init().expect("Failed to initialize GTK");
    let (sender, receiver) = std::sync::mpsc::channel();
    ipc::start_stdin_reader(sender);
    pill::run(receiver);
}
