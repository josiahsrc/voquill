#[allow(unused_imports)]
use std::cell::Cell;
use std::ffi::c_void;

use cocoa::base::{id, nil};
use cocoa::foundation::{NSPoint, NSRect, NSSize, NSString};
#[allow(unused_imports)]
use objc::runtime::Object;

extern "C" {
    fn NSRectFillUsingOperation(rect: NSRect, op: usize);
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct CGPoint {
    pub x: f64,
    pub y: f64,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct CGSize {
    pub width: f64,
    pub height: f64,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct CGRect {
    pub origin: CGPoint,
    pub size: CGSize,
}

pub type CGContextRef = *mut c_void;
type CGColorSpaceRef = *mut c_void;
type CGGradientRef = *mut c_void;

const K_CG_LINE_CAP_ROUND: i32 = 1;
const K_CG_LINE_JOIN_ROUND: i32 = 1;

extern "C" {
    fn CGContextSaveGState(c: CGContextRef);
    fn CGContextRestoreGState(c: CGContextRef);
    fn CGContextSetRGBFillColor(c: CGContextRef, r: f64, g: f64, b: f64, a: f64);
    fn CGContextSetRGBStrokeColor(c: CGContextRef, r: f64, g: f64, b: f64, a: f64);
    fn CGContextSetLineWidth(c: CGContextRef, width: f64);
    fn CGContextSetLineCap(c: CGContextRef, cap: i32);
    fn CGContextSetLineJoin(c: CGContextRef, join: i32);
    fn CGContextMoveToPoint(c: CGContextRef, x: f64, y: f64);
    fn CGContextAddLineToPoint(c: CGContextRef, x: f64, y: f64);
    fn CGContextAddArc(
        c: CGContextRef, x: f64, y: f64, radius: f64,
        start_angle: f64, end_angle: f64, clockwise: i32,
    );
    fn CGContextAddCurveToPoint(
        c: CGContextRef, cp1x: f64, cp1y: f64, cp2x: f64, cp2y: f64, x: f64, y: f64,
    );
    fn CGContextAddRect(c: CGContextRef, rect: CGRect);
    fn CGContextClosePath(c: CGContextRef);
    fn CGContextBeginPath(c: CGContextRef);
    fn CGContextFillPath(c: CGContextRef);
    fn CGContextStrokePath(c: CGContextRef);
    fn CGContextClip(c: CGContextRef);
    fn CGContextTranslateCTM(c: CGContextRef, tx: f64, ty: f64);
    fn CGContextScaleCTM(c: CGContextRef, sx: f64, sy: f64);
    fn CGContextClearRect(c: CGContextRef, rect: CGRect);

    fn CGColorSpaceCreateDeviceRGB() -> CGColorSpaceRef;
    fn CGColorSpaceRelease(space: CGColorSpaceRef);
    fn CGGradientCreateWithColorComponents(
        space: CGColorSpaceRef, components: *const f64,
        locations: *const f64, count: usize,
    ) -> CGGradientRef;
    fn CGGradientRelease(gradient: CGGradientRef);
    fn CGContextDrawLinearGradient(
        c: CGContextRef, gradient: CGGradientRef,
        start_point: CGPoint, end_point: CGPoint, options: u32,
    );
}

pub struct TextExtents {
    pub width: f64,
    pub height: f64,
    pub x_bearing: f64,
    pub y_bearing: f64,
}

pub struct Ctx {
    pub cg: CGContextRef,
    font_name: Cell<&'static str>,
    font_size: Cell<f64>,
    font_bold: Cell<bool>,
    font_italic: Cell<bool>,
    r: Cell<f64>,
    g: Cell<f64>,
    b: Cell<f64>,
    a: Cell<f64>,
    pos_x: Cell<f64>,
    pos_y: Cell<f64>,
}

impl Ctx {
    pub fn new(cg: CGContextRef) -> Self {
        Self {
            cg,
            font_name: Cell::new("HelveticaNeue"),
            font_size: Cell::new(12.0),
            font_bold: Cell::new(false),
            font_italic: Cell::new(false),
            r: Cell::new(0.0),
            g: Cell::new(0.0),
            b: Cell::new(0.0),
            a: Cell::new(1.0),
            pos_x: Cell::new(0.0),
            pos_y: Cell::new(0.0),
        }
    }

    pub fn save(&self) {
        unsafe { CGContextSaveGState(self.cg); }
    }

    pub fn restore(&self) {
        unsafe { CGContextRestoreGState(self.cg); }
    }

    pub fn set_source_rgba(&self, r: f64, g: f64, b: f64, a: f64) {
        self.r.set(r);
        self.g.set(g);
        self.b.set(b);
        self.a.set(a);
        unsafe {
            CGContextSetRGBFillColor(self.cg, r, g, b, a);
            CGContextSetRGBStrokeColor(self.cg, r, g, b, a);
        }
    }

    pub fn fill(&self) {
        unsafe { CGContextFillPath(self.cg); }
    }

    pub fn stroke(&self) {
        unsafe { CGContextStrokePath(self.cg); }
    }

    pub fn clip(&self) {
        unsafe { CGContextClip(self.cg); }
    }

    pub fn move_to(&self, x: f64, y: f64) {
        self.pos_x.set(x);
        self.pos_y.set(y);
        unsafe { CGContextMoveToPoint(self.cg, x, y); }
    }

    pub fn line_to(&self, x: f64, y: f64) {
        unsafe { CGContextAddLineToPoint(self.cg, x, y); }
    }

    pub fn curve_to(&self, cp1x: f64, cp1y: f64, cp2x: f64, cp2y: f64, x: f64, y: f64) {
        unsafe { CGContextAddCurveToPoint(self.cg, cp1x, cp1y, cp2x, cp2y, x, y); }
    }

    pub fn arc(&self, cx: f64, cy: f64, r: f64, start: f64, end: f64) {
        unsafe { CGContextAddArc(self.cg, cx, cy, r, start, end, 0); }
    }

    pub fn new_sub_path(&self) {
        unsafe { CGContextBeginPath(self.cg); }
    }

    pub fn close_path(&self) {
        unsafe { CGContextClosePath(self.cg); }
    }

    pub fn rectangle(&self, x: f64, y: f64, w: f64, h: f64) {
        unsafe {
            CGContextAddRect(self.cg, CGRect {
                origin: CGPoint { x, y },
                size: CGSize { width: w, height: h },
            });
        }
    }

    pub fn set_line_width(&self, w: f64) {
        unsafe { CGContextSetLineWidth(self.cg, w); }
    }

    pub fn set_line_cap_round(&self) {
        unsafe { CGContextSetLineCap(self.cg, K_CG_LINE_CAP_ROUND); }
    }

    pub fn set_line_join_round(&self) {
        unsafe { CGContextSetLineJoin(self.cg, K_CG_LINE_JOIN_ROUND); }
    }

    pub fn scale(&self, sx: f64, sy: f64) {
        unsafe { CGContextScaleCTM(self.cg, sx, sy); }
    }

    pub fn translate(&self, tx: f64, ty: f64) {
        unsafe { CGContextTranslateCTM(self.cg, tx, ty); }
    }

    pub fn paint_clear(&self, w: f64, h: f64) {
        unsafe {
            CGContextClearRect(self.cg, CGRect {
                origin: CGPoint { x: 0.0, y: 0.0 },
                size: CGSize { width: w, height: h },
            });
        }
    }

    // ── Font & text ───────────────────────────────────────────────

    pub fn select_font_face(&self, _name: &str, italic: bool, bold: bool) {
        self.font_bold.set(bold);
        self.font_italic.set(italic);
        let name = if bold && italic {
            "HelveticaNeue-BoldItalic"
        } else if bold {
            "HelveticaNeue-Bold"
        } else if italic {
            "HelveticaNeue-Italic"
        } else {
            "HelveticaNeue"
        };
        self.font_name.set(name);
    }

    pub fn set_font_size(&self, size: f64) {
        self.font_size.set(size);
    }

    fn get_ns_font(&self) -> id {
        unsafe {
            let name = self.font_name.get();
            let size = self.font_size.get();
            let ns_name: id = NSString::alloc(nil).init_str(name);
            let font: id = msg_send![class!(NSFont), fontWithName:ns_name size:size];
            if font == nil {
                msg_send![class!(NSFont), systemFontOfSize:size]
            } else {
                font
            }
        }
    }

    fn make_text_attrs(&self) -> id {
        unsafe {
            let font = self.get_ns_font();
            let color: id = msg_send![class!(NSColor),
                colorWithSRGBRed:self.r.get()
                green:self.g.get()
                blue:self.b.get()
                alpha:self.a.get()
            ];
            let font_key: id = NSString::alloc(nil).init_str("NSFont");
            let color_key: id = NSString::alloc(nil).init_str("NSColor");
            let keys: [id; 2] = [font_key, color_key];
            let values: [id; 2] = [font, color];
            msg_send![class!(NSDictionary),
                dictionaryWithObjects:values.as_ptr()
                forKeys:keys.as_ptr()
                count:2usize
            ]
        }
    }

    pub fn text_extents(&self, text: &str) -> TextExtents {
        unsafe {
            let font = self.get_ns_font();
            let ascent: f64 = msg_send![font, ascender];
            let font_key: id = NSString::alloc(nil).init_str("NSFont");
            let attrs: id = msg_send![class!(NSDictionary),
                dictionaryWithObject:font forKey:font_key];
            let ns_text: id = NSString::alloc(nil).init_str(text);
            let size: NSSize = msg_send![ns_text, sizeWithAttributes:attrs];
            TextExtents {
                width: size.width,
                height: size.height,
                x_bearing: 0.0,
                y_bearing: -ascent,
            }
        }
    }

    pub fn show_text(&self, text: &str) {
        unsafe {
            let attrs = self.make_text_attrs();
            let ns_text: id = NSString::alloc(nil).init_str(text);
            let font = self.get_ns_font();
            let ascent: f64 = msg_send![font, ascender];
            let top_y = self.pos_y.get() - ascent;
            let point = NSPoint::new(self.pos_x.get(), top_y);
            let _: () = msg_send![ns_text, drawAtPoint:point withAttributes:attrs];
        }
    }

    // ── SF Symbols ─────────────────────────────────────────────────

    pub fn draw_symbol(&self, name: &str, cx: f64, cy: f64, size: f64) {
        unsafe {
            let sym_name = NSString::alloc(nil).init_str(name);
            let image: id = msg_send![class!(NSImage),
                imageWithSystemSymbolName:sym_name
                accessibilityDescription:nil
            ];
            if image == nil { return; }

            let config: id = msg_send![class!(NSImageSymbolConfiguration),
                configurationWithPointSize:size
                weight:0.0_f64
                scale:2i64
            ];
            let configured: id = msg_send![image, imageWithSymbolConfiguration:config];
            let img_size: NSSize = msg_send![configured, size];

            // Create tinted copy via lockFocus + SourceIn compositing
            let tinted: id = msg_send![class!(NSImage), alloc];
            let tinted: id = msg_send![tinted, initWithSize:img_size];
            let _: () = msg_send![tinted, lockFocus];

            let bounds = NSRect::new(NSPoint::new(0.0, 0.0), img_size);
            let zero = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(0.0, 0.0));
            let _: () = msg_send![configured,
                drawInRect:bounds fromRect:zero operation:2usize fraction:1.0_f64
            ];

            let color: id = msg_send![class!(NSColor),
                colorWithSRGBRed:self.r.get()
                green:self.g.get()
                blue:self.b.get()
                alpha:self.a.get()
            ];
            let _: () = msg_send![color, setFill];
            NSRectFillUsingOperation(bounds, 3); // NSCompositingOperationSourceIn

            let _: () = msg_send![tinted, unlockFocus];

            let draw_x = cx - img_size.width / 2.0;
            let draw_y = cy - img_size.height / 2.0;
            let dest = NSRect::new(NSPoint::new(draw_x, draw_y), img_size);
            let _: () = msg_send![tinted,
                drawInRect:dest
                fromRect:zero
                operation:2usize
                fraction:1.0_f64
                respectFlipped:cocoa::base::YES
                hints:nil
            ];

            let _: () = msg_send![tinted, release];
        }
    }

    // ── Gradients ─────────────────────────────────────────────────

    pub fn draw_gradient_raw(
        &self, x1: f64, y1: f64, x2: f64, y2: f64,
        stops: &[(f64, f64, f64, f64, f64)],
    ) {
        unsafe {
            let color_space = CGColorSpaceCreateDeviceRGB();
            let mut components = Vec::with_capacity(stops.len() * 4);
            let mut locations = Vec::with_capacity(stops.len());
            for &(loc, r, g, b, a) in stops {
                locations.push(loc);
                components.push(r);
                components.push(g);
                components.push(b);
                components.push(a);
            }
            let gradient = CGGradientCreateWithColorComponents(
                color_space,
                components.as_ptr(),
                locations.as_ptr(),
                stops.len(),
            );
            CGContextDrawLinearGradient(
                self.cg,
                gradient,
                CGPoint { x: x1, y: y1 },
                CGPoint { x: x2, y: y2 },
                3, // kCGGradientDrawsBeforeStartLocation | kCGGradientDrawsAfterEndLocation
            );
            CGGradientRelease(gradient);
            CGColorSpaceRelease(color_space);
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn draw_linear_gradient_in_rect(
        &self,
        clip_x: f64, clip_y: f64, clip_w: f64, clip_h: f64,
        x1: f64, y1: f64, x2: f64, y2: f64,
        stops: &[(f64, f64, f64, f64, f64)],
    ) {
        self.save();
        self.rectangle(clip_x, clip_y, clip_w, clip_h);
        self.clip();
        self.draw_gradient_raw(x1, y1, x2, y2, stops);
        self.restore();
    }
}

// ── Utility ───────────────────────────────────────────────────────

pub fn rounded_rect(ctx: &Ctx, x: f64, y: f64, w: f64, h: f64, r: f64) {
    use std::f64::consts::PI;
    let r = r.min(w / 2.0).min(h / 2.0);
    ctx.new_sub_path();
    ctx.arc(x + w - r, y + r, r, -PI / 2.0, 0.0);
    ctx.arc(x + w - r, y + h - r, r, 0.0, PI / 2.0);
    ctx.arc(x + r, y + h - r, r, PI / 2.0, PI);
    ctx.arc(x + r, y + r, r, PI, 3.0 * PI / 2.0);
    ctx.close_path();
}

pub fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}
