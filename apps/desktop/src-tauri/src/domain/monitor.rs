#[derive(Clone, Copy, Debug, Default)]
pub enum OverlayAnchor {
    #[default]
    BottomCenter,
    TopRight,
    TopLeft,
}

#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MonitorAtCursor {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub visible_x: f64,
    pub visible_y: f64,
    pub visible_width: f64,
    pub visible_height: f64,
    pub scale_factor: f64,
    pub cursor_x: f64,
    pub cursor_y: f64,
}

#[derive(serde::Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ScreenVisibleArea {
    pub top_inset: f64,
    pub bottom_inset: f64,
    pub left_inset: f64,
    pub right_inset: f64,
}
