use rdev::Event;
use std::sync::{Arc, Mutex, Once, OnceLock};

type Handler = Arc<Mutex<Box<dyn FnMut(&Event) + Send + 'static>>>;

fn handler_store() -> Arc<Mutex<Vec<Handler>>> {
    static HANDLERS: OnceLock<Arc<Mutex<Vec<Handler>>>> = OnceLock::new();
    HANDLERS
        .get_or_init(|| Arc::new(Mutex::new(Vec::new())))
        .clone()
}

pub(crate) fn register_handler<F>(handler: F)
where
    F: FnMut(&Event) + Send + 'static,
{
    let handler: Handler = Arc::new(Mutex::new(Box::new(handler)));
    let handlers = handler_store();
    {
        let mut guard = handlers
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        guard.push(handler);
    }

    static START_LISTENER: Once = Once::new();
    START_LISTENER.call_once(|| {
        let handlers = handler_store();
        std::thread::spawn(move || {
            if let Err(err) = rdev::listen(move |event| {
                let registered = {
                    let guard = handlers
                        .lock()
                        .unwrap_or_else(|poisoned| poisoned.into_inner());
                    guard.clone()
                };

                for handler in registered {
                    if let Ok(mut callback) = handler.lock() {
                        (callback)(&event);
                    }
                }
            }) {
                eprintln!("Failed to listen for global key events: {err:?}");
            }
        });
    });
}
