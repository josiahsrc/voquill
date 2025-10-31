use crate::domain::{PermissionKind, PermissionState, PermissionStatus};
use block::ConcreteBlock;
use cocoa::base::{id, nil};
use cocoa::foundation::{NSAutoreleasePool, NSString};
use objc::{class, msg_send, sel, sel_impl};
use std::sync::{Arc, Condvar, Mutex};

const AUTH_STATUS_NOT_DETERMINED: i64 = 0;
const AUTH_STATUS_RESTRICTED: i64 = 1;
const AUTH_STATUS_DENIED: i64 = 2;
const AUTH_STATUS_AUTHORIZED: i64 = 3;

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn CGPreflightListenEventAccess() -> bool;
    fn CGRequestListenEventAccess() -> bool;
}

#[link(name = "AVFoundation", kind = "framework")]
extern "C" {
    static AVMediaTypeAudio: id;
}

pub(crate) fn check_microphone_permission() -> Result<PermissionStatus, String> {
    unsafe {
        let pool = NSAutoreleasePool::new(nil);
        let result = (|| {
            let status: i64 = msg_send![
                class!(AVCaptureDevice),
                authorizationStatusForMediaType: AVMediaTypeAudio
            ];
            let state = permission_state_from_authorization(status)?;
            Ok(PermissionStatus {
                kind: PermissionKind::Microphone,
                state,
                prompt_shown: false,
            })
        })();
        pool.drain();
        result
    }
}

pub(crate) fn request_microphone_permission() -> Result<PermissionStatus, String> {
    unsafe {
        let pool = NSAutoreleasePool::new(nil);
        let result = (|| {
            eprintln!("[macos::permissions] request_microphone_permission invoked");
            let class = class!(AVCaptureDevice);
            let initial_status: i64 =
                msg_send![class, authorizationStatusForMediaType: AVMediaTypeAudio];
            eprintln!(
                "[macos::permissions] request_microphone_permission initial_status={}",
                initial_status
            );
            let prompt_shown = initial_status == AUTH_STATUS_NOT_DETERMINED;
            eprintln!(
                "[macos::permissions] request_microphone_permission prompt_shown={}",
                prompt_shown
            );

            let mut prompt_result = prompt_shown;

            if initial_status == AUTH_STATUS_DENIED {
                eprintln!(
                    "[macos::permissions] microphone permission previously denied; directing user to System Settings"
                );
                if open_microphone_privacy_settings() {
                    prompt_result = true;
                } else {
                    eprintln!(
                        "[macos::permissions] failed to open System Settings privacy pane for microphone"
                    );
                }
            }

            if prompt_shown {
                let state_pair = Arc::new((Mutex::new(None::<bool>), Condvar::new()));
                let state_pair_clone = Arc::clone(&state_pair);

                let handler = ConcreteBlock::new(move |granted: bool| {
                    eprintln!(
                        "[macos::permissions] microphone permission callback invoked granted={}",
                        granted
                    );
                    let (lock, cvar) = &*state_pair_clone;
                    if let Ok(mut slot) = lock.lock() {
                        *slot = Some(granted);
                        cvar.notify_one();
                    }
                })
                .copy();

                let _: () = msg_send![
                    class,
                    requestAccessForMediaType: AVMediaTypeAudio
                    completionHandler: &*handler
                ];
                eprintln!("[macos::permissions] waiting for microphone prompt response");

                let (lock, cvar) = &*state_pair;
                let mut result = lock
                    .lock()
                    .map_err(|_| "Microphone request mutex poisoned".to_string())?;
                while result.is_none() {
                    result = cvar
                        .wait(result)
                        .map_err(|_| "Microphone request mutex poisoned".to_string())?;
                }
                let granted_value = result.as_ref().copied().unwrap_or(false);
                eprintln!(
                    "[macos::permissions] microphone prompt resolved granted={}",
                    granted_value
                );
            }

            let final_status: i64 =
                msg_send![class, authorizationStatusForMediaType: AVMediaTypeAudio];
            eprintln!(
                "[macos::permissions] request_microphone_permission final_status={}",
                final_status
            );
            let state = permission_state_from_authorization(final_status)?;
            eprintln!(
                "[macos::permissions] request_microphone_permission resolved_state={:?}",
                state
            );

            Ok(PermissionStatus {
                kind: PermissionKind::Microphone,
                state,
                prompt_shown: prompt_result,
            })
        })();
        pool.drain();
        result
    }
}

pub(crate) fn check_input_monitoring_permission() -> Result<PermissionStatus, String> {
    unsafe {
        let trusted = CGPreflightListenEventAccess();
        let state = if trusted {
            PermissionState::Authorized
        } else {
            PermissionState::Denied
        };

        Ok(PermissionStatus {
            kind: PermissionKind::InputMonitoring,
            state,
            prompt_shown: false,
        })
    }
}

fn permission_state_from_authorization(status: i64) -> Result<PermissionState, String> {
    match status {
        AUTH_STATUS_AUTHORIZED => Ok(PermissionState::Authorized),
        AUTH_STATUS_DENIED => Ok(PermissionState::Denied),
        AUTH_STATUS_RESTRICTED => Ok(PermissionState::Restricted),
        AUTH_STATUS_NOT_DETERMINED => Ok(PermissionState::NotDetermined),
        other => {
            eprintln!(
                "[macos::permissions] unexpected microphone authorization status={}",
                other
            );
            Err(format!("Unknown authorization status: {}", other))
        }
    }
}

fn open_microphone_privacy_settings() -> bool {
    unsafe {
        let url_string = NSString::alloc(nil)
            .init_str("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone");
        let url: id = msg_send![class!(NSURL), URLWithString: url_string];
        if url == nil {
            let _: () = msg_send![url_string, release];
            return false;
        }

        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let success: bool = msg_send![workspace, openURL: url];

        let _: () = msg_send![url_string, release];

        success
    }
}

fn open_input_monitoring_privacy_settings() -> bool {
    unsafe {
        let url_string = NSString::alloc(nil).init_str(
            "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent",
        );
        let url: id = msg_send![class!(NSURL), URLWithString: url_string];
        if url == nil {
            let _: () = msg_send![url_string, release];
            return false;
        }

        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let success: bool = msg_send![workspace, openURL: url];

        let _: () = msg_send![url_string, release];

        success
    }
}

pub(crate) fn request_input_monitoring_permission() -> Result<PermissionStatus, String> {
    unsafe {
        eprintln!("[macos::permissions] request_input_monitoring_permission invoked");
        let initial_trusted = CGPreflightListenEventAccess();
        eprintln!(
            "[macos::permissions] request_input_monitoring_permission initial_trusted={}",
            initial_trusted
        );

        if initial_trusted {
            return Ok(PermissionStatus {
                kind: PermissionKind::InputMonitoring,
                state: PermissionState::Authorized,
                prompt_shown: false,
            });
        }

        let request_result = CGRequestListenEventAccess();
        eprintln!(
            "[macos::permissions] request_input_monitoring_permission request_result={}",
            request_result
        );

        let mut prompt_shown = request_result || !initial_trusted;

        let mut final_trusted = CGPreflightListenEventAccess();
        eprintln!(
            "[macos::permissions] request_input_monitoring_permission final_trusted_after_request={}",
            final_trusted
        );

        if !final_trusted {
            let settings_opened = open_input_monitoring_privacy_settings();
            eprintln!(
                "[macos::permissions] input monitoring settings opened via helper={}",
                settings_opened
            );
            if settings_opened {
                final_trusted = CGPreflightListenEventAccess();
                eprintln!(
                    "[macos::permissions] request_input_monitoring_permission final_trusted_after_settings={}",
                    final_trusted
                );
            }
            prompt_shown |= settings_opened;
        }

        let state = if final_trusted {
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
