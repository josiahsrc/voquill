use std::ffi::c_void;
use std::mem::ManuallyDrop;

use windows::core::*;
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Direct2D::Common::*;
use windows::Win32::Graphics::Direct2D::*;
use windows::Win32::Graphics::DirectWrite::*;
use windows::Win32::Graphics::Dxgi::Common::*;
use windows::Win32::Graphics::Gdi::*;
use windows_numerics::{Matrix3x2, Vector2};

enum ClipKind {
    AxisAligned,
    Layer,
}

struct SaveState {
    transform: Matrix3x2,
    clip_count: usize,
}

pub(crate) struct Gfx {
    factory: ID2D1Factory,
    rt: ID2D1DCRenderTarget,
    dw_factory: IDWriteFactory,
    pub(crate) hdc: HDC,
    bitmap: HBITMAP,
    pub(crate) width: i32,
    pub(crate) height: i32,
    save_stack: Vec<SaveState>,
    clip_kinds: Vec<ClipKind>,
    current_transform: Matrix3x2,
}

impl Drop for Gfx {
    fn drop(&mut self) {
        unsafe {
            let _ = DeleteObject(HGDIOBJ(self.bitmap.0));
            let _ = DeleteDC(self.hdc);
        }
    }
}

fn color(r: f64, g: f64, b: f64, a: f64) -> D2D1_COLOR_F {
    D2D1_COLOR_F { r: r as f32, g: g as f32, b: b as f32, a: a as f32 }
}

fn vec2(x: f64, y: f64) -> Vector2 {
    Vector2 { X: x as f32, Y: y as f32 }
}

impl Gfx {
    pub(crate) fn new(width: i32, height: i32) -> Result<Self> {
        unsafe {
            let factory: ID2D1Factory =
                D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, None)?;

            let props = D2D1_RENDER_TARGET_PROPERTIES {
                r#type: D2D1_RENDER_TARGET_TYPE_DEFAULT,
                pixelFormat: D2D1_PIXEL_FORMAT {
                    format: DXGI_FORMAT_B8G8R8A8_UNORM,
                    alphaMode: D2D1_ALPHA_MODE_PREMULTIPLIED,
                },
                dpiX: 0.0,
                dpiY: 0.0,
                usage: D2D1_RENDER_TARGET_USAGE_NONE,
                minLevel: D2D1_FEATURE_LEVEL_DEFAULT,
            };
            let rt = factory.CreateDCRenderTarget(&props)?;
            rt.SetAntialiasMode(D2D1_ANTIALIAS_MODE_PER_PRIMITIVE);
            rt.SetTextAntialiasMode(D2D1_TEXT_ANTIALIAS_MODE_GRAYSCALE);

            let dw_factory: IDWriteFactory =
                DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED)?;

            let screen_dc = GetDC(None);
            let hdc = CreateCompatibleDC(Some(screen_dc));
            ReleaseDC(None, screen_dc);

            let bitmap = create_dib(hdc, width, height);

            SelectObject(hdc, HGDIOBJ(bitmap.0));

            Ok(Self {
                factory,
                rt,
                dw_factory,
                hdc,
                bitmap,
                width,
                height,
                save_stack: Vec::new(),
                clip_kinds: Vec::new(),
                current_transform: Matrix3x2::identity(),
            })
        }
    }

    pub(crate) fn resize(&mut self, width: i32, height: i32) {
        if width == self.width && height == self.height {
            return;
        }
        unsafe {
            let new_bitmap = create_dib(self.hdc, width, height);
            SelectObject(self.hdc, HGDIOBJ(new_bitmap.0));
            let _ = DeleteObject(HGDIOBJ(self.bitmap.0));
            self.bitmap = new_bitmap;
            self.width = width;
            self.height = height;
        }
    }

    pub(crate) fn begin_frame(&mut self) {
        self.save_stack.clear();
        self.clip_kinds.clear();
        self.current_transform = Matrix3x2::identity();
        unsafe {
            let rect = RECT { left: 0, top: 0, right: self.width, bottom: self.height };
            self.rt.BindDC(self.hdc, &rect).ok();
            self.rt.BeginDraw();
            self.rt.SetTransform(&self.current_transform);
        }
    }

    pub(crate) fn end_frame(&mut self) {
        while let Some(kind) = self.clip_kinds.pop() {
            unsafe {
                match kind {
                    ClipKind::AxisAligned => self.rt.PopAxisAlignedClip(),
                    ClipKind::Layer => self.rt.PopLayer(),
                }
            }
        }
        self.save_stack.clear();
        unsafe {
            let _ = self.rt.EndDraw(None, None);
        }
    }

    pub(crate) fn clear(&self) {
        unsafe { self.rt.Clear(Some(&color(0.0, 0.0, 0.0, 0.0))); }
    }

    pub(crate) fn save(&mut self) {
        self.save_stack.push(SaveState {
            transform: self.current_transform,
            clip_count: 0,
        });
    }

    pub(crate) fn restore(&mut self) {
        if let Some(state) = self.save_stack.pop() {
            for _ in 0..state.clip_count {
                if let Some(kind) = self.clip_kinds.pop() {
                    unsafe {
                        match kind {
                            ClipKind::AxisAligned => self.rt.PopAxisAlignedClip(),
                            ClipKind::Layer => self.rt.PopLayer(),
                        }
                    }
                }
            }
            self.current_transform = state.transform;
            unsafe { self.rt.SetTransform(&self.current_transform); }
        }
    }

    pub(crate) fn translate(&mut self, dx: f64, dy: f64) {
        self.current_transform = Matrix3x2::translation(dx as f32, dy as f32) * self.current_transform;
        unsafe { self.rt.SetTransform(&self.current_transform); }
    }

    pub(crate) fn scale(&mut self, sx: f64, sy: f64) {
        self.current_transform = Matrix3x2::scale(sx as f32, sy as f32) * self.current_transform;
        unsafe { self.rt.SetTransform(&self.current_transform); }
    }

    pub(crate) fn clip_rect(&mut self, x: f64, y: f64, w: f64, h: f64) {
        unsafe {
            self.rt.PushAxisAlignedClip(
                &D2D_RECT_F {
                    left: x as f32, top: y as f32,
                    right: (x + w) as f32, bottom: (y + h) as f32,
                },
                D2D1_ANTIALIAS_MODE_PER_PRIMITIVE,
            );
        }
        self.clip_kinds.push(ClipKind::AxisAligned);
        if let Some(s) = self.save_stack.last_mut() { s.clip_count += 1; }
    }

    pub(crate) fn clip_rounded_rect(&mut self, x: f64, y: f64, w: f64, h: f64, r: f64) {
        unsafe {
            let geom = self.factory.CreateRoundedRectangleGeometry(&D2D1_ROUNDED_RECT {
                rect: D2D_RECT_F {
                    left: x as f32, top: y as f32,
                    right: (x + w) as f32, bottom: (y + h) as f32,
                },
                radiusX: r as f32, radiusY: r as f32,
            }).unwrap();

            let geom_id2d1: ID2D1Geometry = geom.cast().unwrap();
            let params = D2D1_LAYER_PARAMETERS {
                contentBounds: D2D_RECT_F {
                    left: f32::MIN, top: f32::MIN,
                    right: f32::MAX, bottom: f32::MAX,
                },
                geometricMask: ManuallyDrop::new(Some(geom_id2d1)),
                maskAntialiasMode: D2D1_ANTIALIAS_MODE_PER_PRIMITIVE,
                maskTransform: Matrix3x2::identity(),
                opacity: 1.0,
                opacityBrush: ManuallyDrop::new(None),
                layerOptions: D2D1_LAYER_OPTIONS_NONE,
            };
            self.rt.PushLayer(&params, None);
        }
        self.clip_kinds.push(ClipKind::Layer);
        if let Some(s) = self.save_stack.last_mut() { s.clip_count += 1; }
    }

    fn brush(&self, rgba: [f64; 4]) -> ID2D1SolidColorBrush {
        unsafe {
            self.rt.CreateSolidColorBrush(
                &color(rgba[0], rgba[1], rgba[2], rgba[3]),
                None,
            ).unwrap()
        }
    }

    pub(crate) fn fill_rounded_rect(&self, x: f64, y: f64, w: f64, h: f64, r: f64, rgba: [f64; 4]) {
        let r = r.min(w / 2.0).min(h / 2.0);
        let brush = self.brush(rgba);
        unsafe {
            self.rt.FillRoundedRectangle(
                &D2D1_ROUNDED_RECT {
                    rect: D2D_RECT_F {
                        left: x as f32, top: y as f32,
                        right: (x + w) as f32, bottom: (y + h) as f32,
                    },
                    radiusX: r as f32, radiusY: r as f32,
                },
                &brush,
            );
        }
    }

    pub(crate) fn stroke_rounded_rect(&self, x: f64, y: f64, w: f64, h: f64, r: f64, rgba: [f64; 4], width: f64) {
        let r = r.min(w / 2.0).min(h / 2.0);
        let brush = self.brush(rgba);
        unsafe {
            self.rt.DrawRoundedRectangle(
                &D2D1_ROUNDED_RECT {
                    rect: D2D_RECT_F {
                        left: x as f32, top: y as f32,
                        right: (x + w) as f32, bottom: (y + h) as f32,
                    },
                    radiusX: r as f32, radiusY: r as f32,
                },
                &brush,
                width as f32,
                None,
            );
        }
    }

    pub(crate) fn fill_rect(&self, x: f64, y: f64, w: f64, h: f64, rgba: [f64; 4]) {
        let brush = self.brush(rgba);
        unsafe {
            self.rt.FillRectangle(
                &D2D_RECT_F {
                    left: x as f32, top: y as f32,
                    right: (x + w) as f32, bottom: (y + h) as f32,
                },
                &brush,
            );
        }
    }

    pub(crate) fn draw_line(&self, x1: f64, y1: f64, x2: f64, y2: f64, rgba: [f64; 4], width: f64) {
        let brush = self.brush(rgba);
        let style = unsafe {
            self.factory.CreateStrokeStyle(
                &D2D1_STROKE_STYLE_PROPERTIES {
                    startCap: D2D1_CAP_STYLE_ROUND,
                    endCap: D2D1_CAP_STYLE_ROUND,
                    lineJoin: D2D1_LINE_JOIN_ROUND,
                    ..Default::default()
                },
                None,
            ).ok()
        };
        unsafe {
            self.rt.DrawLine(
                vec2(x1, y1),
                vec2(x2, y2),
                &brush,
                width as f32,
                style.as_ref(),
            );
        }
    }

    pub(crate) fn fill_circle(&self, cx: f64, cy: f64, r: f64, rgba: [f64; 4]) {
        let brush = self.brush(rgba);
        unsafe {
            self.rt.FillEllipse(
                &D2D1_ELLIPSE {
                    point: vec2(cx, cy),
                    radiusX: r as f32,
                    radiusY: r as f32,
                },
                &brush,
            );
        }
    }

    pub(crate) fn stroke_circle(&self, cx: f64, cy: f64, r: f64, rgba: [f64; 4], width: f64) {
        let brush = self.brush(rgba);
        unsafe {
            self.rt.DrawEllipse(
                &D2D1_ELLIPSE {
                    point: vec2(cx, cy),
                    radiusX: r as f32,
                    radiusY: r as f32,
                },
                &brush,
                width as f32,
                None,
            );
        }
    }

    pub(crate) fn fill_gradient_rect(
        &self, x: f64, y: f64, w: f64, h: f64,
        sx: f64, sy: f64, ex: f64, ey: f64,
        stops: &[(f64, [f64; 4])],
    ) {
        let d2d_stops: Vec<D2D1_GRADIENT_STOP> = stops.iter().map(|(pos, c)| {
            D2D1_GRADIENT_STOP {
                position: *pos as f32,
                color: color(c[0], c[1], c[2], c[3]),
            }
        }).collect();
        unsafe {
            let stop_col = self.rt.CreateGradientStopCollection(&d2d_stops, D2D1_GAMMA_2_2, D2D1_EXTEND_MODE_CLAMP).unwrap();
            let brush = self.rt.CreateLinearGradientBrush(
                &D2D1_LINEAR_GRADIENT_BRUSH_PROPERTIES {
                    startPoint: vec2(sx, sy),
                    endPoint: vec2(ex, ey),
                },
                None,
                &stop_col,
            ).unwrap();
            self.rt.FillRectangle(
                &D2D_RECT_F {
                    left: x as f32, top: y as f32,
                    right: (x + w) as f32, bottom: (y + h) as f32,
                },
                &brush,
            );
        }
    }

    pub(crate) fn fill_flame_tongue(
        &self, cx: f64, base_y: f64, h: f64, hw: f64, sway: f64,
        stops: &[(f64, f64, f64, f64, f64)],
    ) {
        if h < 0.5 || hw < 0.5 { return; }
        let tip_x = cx + sway;
        let tip_y = base_y - h;
        let base_r = hw.min(h * 0.15);

        unsafe {
            let geom = self.factory.CreatePathGeometry().unwrap();
            let sink = geom.Open().unwrap();

            sink.BeginFigure(vec2(cx - hw, base_y - base_r), D2D1_FIGURE_BEGIN_FILLED);

            // Left edge bezier to tip
            sink.AddBezier(&D2D1_BEZIER_SEGMENT {
                point1: vec2(cx - hw * 1.15, base_y - h * 0.35),
                point2: vec2(cx - hw * 0.12 + sway * 0.3, base_y - h * 0.72),
                point3: vec2(tip_x, tip_y),
            });

            // Right edge bezier from tip back down
            sink.AddBezier(&D2D1_BEZIER_SEGMENT {
                point1: vec2(cx + hw * 0.12 + sway * 0.3, base_y - h * 0.72),
                point2: vec2(cx + hw * 1.15, base_y - h * 0.35),
                point3: vec2(cx + hw, base_y - base_r),
            });

            // Rounded bottom arc from right to left
            sink.AddArc(&D2D1_ARC_SEGMENT {
                point: vec2(cx - hw, base_y - base_r),
                size: D2D_SIZE_F { width: hw as f32, height: hw as f32 },
                rotationAngle: 0.0,
                sweepDirection: D2D1_SWEEP_DIRECTION_CLOCKWISE,
                arcSize: D2D1_ARC_SIZE_SMALL,
            });

            sink.EndFigure(D2D1_FIGURE_END_CLOSED);
            sink.Close().ok();

            let d2d_stops: Vec<D2D1_GRADIENT_STOP> = stops.iter().map(|(pos, r, g, b, a)| {
                D2D1_GRADIENT_STOP {
                    position: *pos as f32,
                    color: color(*r, *g, *b, *a),
                }
            }).collect();

            let stop_col = self.rt.CreateGradientStopCollection(&d2d_stops, D2D1_GAMMA_2_2, D2D1_EXTEND_MODE_CLAMP).unwrap();
            let brush = self.rt.CreateLinearGradientBrush(
                &D2D1_LINEAR_GRADIENT_BRUSH_PROPERTIES {
                    startPoint: vec2(cx, base_y),
                    endPoint: vec2(cx, tip_y),
                },
                None,
                &stop_col,
            ).unwrap();

            self.rt.FillGeometry(&geom, &brush, None);
        }
    }

    fn text_format(&self, size: f64, bold: bool, italic: bool) -> IDWriteTextFormat {
        unsafe {
            let weight = if bold { DWRITE_FONT_WEIGHT_BOLD } else { DWRITE_FONT_WEIGHT_NORMAL };
            let style = if italic { DWRITE_FONT_STYLE_ITALIC } else { DWRITE_FONT_STYLE_NORMAL };
            self.dw_factory.CreateTextFormat(
                w!("Segoe UI"),
                None,
                weight,
                style,
                DWRITE_FONT_STRETCH_NORMAL,
                size as f32,
                w!("en-us"),
            ).unwrap()
        }
    }

    pub(crate) fn measure_text(&self, text: &str, size: f64, bold: bool) -> (f64, f64) {
        let format = self.text_format(size, bold, false);
        let wide: Vec<u16> = text.encode_utf16().collect();
        unsafe {
            let layout = self.dw_factory.CreateTextLayout(
                &wide, &format, 10000.0, 1000.0,
            ).unwrap();
            let mut metrics = DWRITE_TEXT_METRICS::default();
            layout.GetMetrics(&mut metrics).ok();
            (metrics.widthIncludingTrailingWhitespace as f64, metrics.height as f64)
        }
    }

    pub(crate) fn draw_text_top_left(
        &self, text: &str, x: f64, y: f64,
        size: f64, bold: bool, italic: bool, rgba: [f64; 4],
    ) {
        let brush = self.brush(rgba);
        let format = self.text_format(size, bold, italic);
        let wide: Vec<u16> = text.encode_utf16().collect();
        unsafe {
            self.rt.DrawText(
                &wide,
                &format,
                &D2D_RECT_F {
                    left: x as f32, top: y as f32,
                    right: (x + 2000.0) as f32, bottom: (y + 2000.0) as f32,
                },
                &brush,
                D2D1_DRAW_TEXT_OPTIONS_NONE,
                DWRITE_MEASURING_MODE_NATURAL,
            );
        }
    }

    pub(crate) fn draw_text_centered(
        &self, text: &str, x: f64, y: f64, w: f64, h: f64,
        size: f64, bold: bool, rgba: [f64; 4],
    ) {
        let (tw, th) = self.measure_text(text, size, bold);
        let tx = x + (w - tw) / 2.0;
        let ty = y + (h - th) / 2.0;
        self.draw_text_top_left(text, tx, ty, size, bold, false, rgba);
    }
}

unsafe fn create_dib(hdc: HDC, width: i32, height: i32) -> HBITMAP {
    let bmi = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: width,
            biHeight: -height,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        },
        ..Default::default()
    };
    let mut bits: *mut c_void = std::ptr::null_mut();
    CreateDIBSection(Some(hdc), &bmi, DIB_RGB_COLORS, &mut bits, None, 0)
        .unwrap_or(HBITMAP::default())
}
