use cocoa::appkit::{
    NSApp, NSApplication, NSApplicationActivationPolicyAccessory, NSBackingStoreBuffered,
    NSColor, NSWindow, NSWindowCollectionBehavior, NSWindowStyleMask,
};
use cocoa::base::{id, nil, NO};
use cocoa::foundation::{NSAutoreleasePool, NSPoint, NSRect, NSSize};

fn main() {
    unsafe {
        let _pool = NSAutoreleasePool::new(nil);
        let app = NSApp();
        app.setActivationPolicy_(NSApplicationActivationPolicyAccessory);

        let rect = NSRect::new(NSPoint::new(100.0, 100.0), NSSize::new(200.0, 100.0));
        let window = NSWindow::alloc(nil).initWithContentRect_styleMask_backing_defer_(
            rect,
            NSWindowStyleMask::NSBorderlessWindowMask,
            NSBackingStoreBuffered,
            NO,
        );

        // Screen-saver level (1000) to float above everything including fullscreen apps
        window.setLevel_(1000);
        window.setOpaque_(NO);
        window.setBackgroundColor_(NSColor::colorWithRed_green_blue_alpha_(nil, 1.0, 0.0, 0.0, 1.0));
        window.setHasShadow_(NO);
        window.setCollectionBehavior_(
            NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary,
        );
        window.makeKeyAndOrderFront_(nil);

        app.run();
    }
}
