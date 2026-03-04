use crate::platform::keyboard::{send_event_to_tcp, KeyboardEventPayload, WireEventKind};
use std::collections::HashMap;
use std::io::BufWriter;
use std::net::TcpStream;
use std::os::unix::io::AsRawFd;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

fn is_keyboard_device(dev: &evdev::Device) -> bool {
    dev.supported_keys().map_or(false, |keys| {
        keys.contains(evdev::Key::KEY_A)
            && keys.contains(evdev::Key::KEY_Z)
            && keys.contains(evdev::Key::KEY_ENTER)
    })
}

fn find_keyboard_devices() -> Result<HashMap<PathBuf, evdev::Device>, String> {
    let mut keyboards = HashMap::new();
    for (path, device) in evdev::enumerate() {
        if is_keyboard_device(&device) {
            keyboards.insert(path, device);
        }
    }
    Ok(keyboards)
}

fn diagnose_no_devices() -> String {
    match std::fs::read_dir("/dev/input") {
        Ok(entries) => {
            let event_count = entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_name().to_string_lossy().starts_with("event"))
                .count();
            if event_count == 0 {
                "evdev: no input devices found in /dev/input/".to_string()
            } else {
                format!(
                    "evdev: found {event_count} input device(s) but none are accessible. \
                     Add your user to the 'input' group: sudo usermod -aG input $USER \
                     then log out and back in."
                )
            }
        }
        Err(e) => format!("evdev: cannot read /dev/input: {e}"),
    }
}

fn set_nonblocking(fd: i32) -> Result<(), String> {
    unsafe {
        let flags = libc::fcntl(fd, libc::F_GETFL);
        if flags < 0 {
            return Err(format!(
                "fcntl F_GETFL: {}",
                std::io::Error::last_os_error()
            ));
        }
        if libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) < 0 {
            return Err(format!(
                "fcntl F_SETFL: {}",
                std::io::Error::last_os_error()
            ));
        }
    }
    Ok(())
}

fn process_evdev_event(event: &evdev::InputEvent, writer: &Mutex<BufWriter<TcpStream>>) {
    if event.event_type() != evdev::EventType::KEY {
        return;
    }

    let kind = match event.value() {
        1 => WireEventKind::Press,
        0 => WireEventKind::Release,
        _ => return,
    };

    let code = event.code();
    let key_label = super::evdev_keys::evdev_code_to_key_label(code);
    let scan_code = super::evdev_keys::evdev_code_to_scan_code(code);
    let raw_code = if key_label.starts_with("Unknown(") {
        Some(scan_code)
    } else {
        None
    };

    send_event_to_tcp(
        writer,
        &KeyboardEventPayload {
            kind,
            key_label,
            raw_code,
            scan_code,
        },
    );
}

pub fn run_evdev_listen_loop(writer: Arc<Mutex<BufWriter<TcpStream>>>) -> Result<(), String> {
    let mut devices = find_keyboard_devices()?;
    if devices.is_empty() {
        return Err(diagnose_no_devices());
    }

    eprintln!("evdev: found {} keyboard device(s)", devices.len());

    for dev in devices.values() {
        set_nonblocking(dev.as_raw_fd())?;
    }

    loop {
        let paths: Vec<PathBuf> = devices.keys().cloned().collect();
        let mut pollfds: Vec<libc::pollfd> = paths
            .iter()
            .map(|p| libc::pollfd {
                fd: devices[p].as_raw_fd(),
                events: libc::POLLIN,
                revents: 0,
            })
            .collect();

        let ret = unsafe {
            libc::poll(
                pollfds.as_mut_ptr(),
                pollfds.len() as libc::nfds_t,
                5000,
            )
        };

        if ret < 0 {
            let err = std::io::Error::last_os_error();
            if err.kind() == std::io::ErrorKind::Interrupted {
                continue;
            }
            return Err(format!("evdev poll error: {err}"));
        }

        let mut to_remove = Vec::new();

        for (i, pfd) in pollfds.iter().enumerate() {
            if pfd.revents & (libc::POLLHUP | libc::POLLERR | libc::POLLNVAL) != 0 {
                eprintln!("evdev: device disconnected: {}", paths[i].display());
                to_remove.push(paths[i].clone());
                continue;
            }

            if pfd.revents & libc::POLLIN != 0 {
                if let Some(dev) = devices.get_mut(&paths[i]) {
                    match dev.fetch_events() {
                        Ok(events) => {
                            for ev in events {
                                process_evdev_event(&ev, &writer);
                            }
                        }
                        Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                        Err(e) => {
                            eprintln!("evdev: read error on {}: {e}", paths[i].display());
                            to_remove.push(paths[i].clone());
                        }
                    }
                }
            }
        }

        for path in &to_remove {
            devices.remove(path);
        }

        // Re-enumerate on timeout or device removal for hotplug support
        if ret == 0 || !to_remove.is_empty() {
            if let Ok(new_devices) = find_keyboard_devices() {
                for (path, dev) in new_devices {
                    if !devices.contains_key(&path) {
                        eprintln!("evdev: new keyboard device: {}", path.display());
                        if set_nonblocking(dev.as_raw_fd()).is_ok() {
                            devices.insert(path, dev);
                        }
                    }
                }
            }
        }
    }
}
