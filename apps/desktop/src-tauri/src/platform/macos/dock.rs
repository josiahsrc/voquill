use cocoa::appkit::{
    NSApp, NSApplication, NSApplicationActivationPolicy, NSApplicationActivationPolicyAccessory,
    NSApplicationActivationPolicyRegular,
};
use cocoa::base::{nil, YES};

fn set_activation_policy(policy: NSApplicationActivationPolicy) -> Result<(), String> {
    unsafe {
        let app = NSApp();
        if app == nil {
            return Err("NSApp is not available".to_string());
        }

        let result = NSApplication::setActivationPolicy_(app, policy);
        if result != YES {
            return Err("unable to set activation policy".to_string());
        }
    }

    Ok(())
}

pub fn show_dock_icon() -> Result<(), String> {
    set_activation_policy(NSApplicationActivationPolicyRegular)
}

pub fn hide_dock_icon() -> Result<(), String> {
    set_activation_policy(NSApplicationActivationPolicyAccessory)
}
