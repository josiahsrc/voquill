use crate::domain::{PermissionKind, PermissionState, PermissionStatus};
use block::ConcreteBlock;
use cocoa::base::{id, nil};
use cocoa::foundation::{NSAutoreleasePool, NSString};
use objc::{class, msg_send, sel, sel_impl};
use std::sync::{Arc, Condvar, Mutex};

type Boolean = u8;

const AUTH_STATUS_NOT_DETERMINED: i64 = 0;
const AUTH_STATUS_RESTRICTED: i64 = 1;
const AUTH_STATUS_DENIED: i64 = 2;
const AUTH_STATUS_AUTHORIZED: i64 = 3;

const IO_HID_REQUEST_TYPE_LISTEN_EVENT: u32 = 1;

#[link(name = "IOKit", kind = "framework")]
extern "C" {
    fn IOHIDCheckAccess(access_type: u32) -> Boolean;
    fn IOHIDRequestAccess(access_type: u32) -> Boolean;
}

fn boolean_to_bool(value: Boolean) -> bool {
    value != 0
}

pub fn ensure_microphone_permission() -> Result<PermissionStatus, String> {
    unsafe {
        let pool = NSAutoreleasePool::new(nil);
        let media_type: id = NSString::alloc(nil).init_str("soun");

        let current_status: i64 = msg_send![class!(AVCaptureDevice),
            authorizationStatusForMediaType: media_type
        ];

        let mut prompt_shown = false;
        let final_state = if current_status == AUTH_STATUS_NOT_DETERMINED {
            prompt_shown = true;

            let pair = Arc::new((Mutex::new(None), Condvar::new()));
            let pair_clone = Arc::clone(&pair);

            let handler = ConcreteBlock::new(move |granted: bool| {
                let (lock, cvar) = &*pair_clone;
                if let Ok(mut guard) = lock.lock() {
                    *guard = Some(granted);
                    cvar.notify_one();
                }
            })
            .copy();

            let handler_ptr = (&*handler) as *const _ as *mut std::ffi::c_void;

            let _: () = msg_send![class!(AVCaptureDevice),
                requestAccessForMediaType: media_type
                completionHandler: handler_ptr
            ];

            let (lock, cvar) = &*pair;
            let mut guard = lock
                .lock()
                .map_err(|_| "microphone permission waiter panicked")?;
            while guard.is_none() {
                guard = cvar
                    .wait(guard)
                    .map_err(|_| "microphone permission waiter panicked")?;
            }

            if guard.unwrap_or(false) {
                PermissionState::Authorized
            } else {
                PermissionState::Denied
            }
        } else {
            match current_status {
                AUTH_STATUS_AUTHORIZED => PermissionState::Authorized,
                AUTH_STATUS_DENIED => PermissionState::Denied,
                AUTH_STATUS_RESTRICTED => PermissionState::Restricted,
                _ => PermissionState::NotDetermined,
            }
        };

        let _: () = msg_send![media_type, release];
        pool.drain();

        Ok(PermissionStatus {
            kind: PermissionKind::Microphone,
            state: final_state,
            prompt_shown,
        })
    }
}

pub fn ensure_input_monitor_permission() -> Result<PermissionStatus, String> {
    unsafe {
        let initial_granted = boolean_to_bool(IOHIDCheckAccess(IO_HID_REQUEST_TYPE_LISTEN_EVENT));
        let mut prompt_shown = false;

        if !initial_granted {
            prompt_shown = boolean_to_bool(IOHIDRequestAccess(IO_HID_REQUEST_TYPE_LISTEN_EVENT));
        }

        let granted = boolean_to_bool(IOHIDCheckAccess(IO_HID_REQUEST_TYPE_LISTEN_EVENT));
        let state = if granted {
            PermissionState::Authorized
        } else {
            PermissionState::Denied
        };

        Ok(PermissionStatus {
            kind: PermissionKind::InputMonitoring,
            state,
            prompt_shown,
        })
    }
}
