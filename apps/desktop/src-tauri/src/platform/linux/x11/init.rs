pub fn init_x11_threads() {
    unsafe {
        x11::xlib::XInitThreads();
    }
}
