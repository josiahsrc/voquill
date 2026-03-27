use crate::ipc::{self, OutMessage, Phase};

use crate::constants::*;
use crate::draw::pill_position;
use crate::gfx;
use crate::state::{ClickAction, PillState};

pub(crate) fn handle_click(state: &PillState, x: f64, y: f64) {
    let s = state.ui_scale;
    let (ox, oy) = state.content_offset();
    let x = x / s - ox;
    let y = y / s - oy;

    let regions = state.click_regions.borrow();
    for region in regions.iter().rev() {
        if region.contains(x, y) {
            match &region.action {
                ClickAction::Pill => {
                    if state.assistant_active.get() {
                        ipc::send(&OutMessage::AgentTalk);
                    } else {
                        ipc::send(&OutMessage::Click);
                    }
                }
                ClickAction::StyleForward => {
                    ipc::send(&OutMessage::StyleSwitch { direction: "forward".to_string() });
                }
                ClickAction::StyleBackward => {
                    ipc::send(&OutMessage::StyleSwitch { direction: "backward".to_string() });
                }
                ClickAction::AssistantClose => {
                    ipc::send(&OutMessage::AssistantClose);
                }
                ClickAction::OpenInNew => {
                    if let Some(ref id) = *state.assistant_conversation_id.borrow() {
                        ipc::send(&OutMessage::OpenConversation { conversation_id: id.clone() });
                    }
                    ipc::send(&OutMessage::AssistantClose);
                }
                ClickAction::KeyboardButton => {
                    ipc::send(&OutMessage::EnableTypeMode);
                }
                ClickAction::CancelDictation => {
                    ipc::send(&OutMessage::CancelDictation);
                }
                ClickAction::PermissionAllow(id) => {
                    ipc::send(&OutMessage::ResolvePermission {
                        permission_id: id.clone(), status: "allowed".to_string(), always_allow: false,
                    });
                }
                ClickAction::PermissionDeny(id) => {
                    ipc::send(&OutMessage::ResolvePermission {
                        permission_id: id.clone(), status: "denied".to_string(), always_allow: false,
                    });
                }
                ClickAction::PermissionAlwaysAllow(id) => {
                    ipc::send(&OutMessage::ResolvePermission {
                        permission_id: id.clone(), status: "allowed".to_string(), always_allow: true,
                    });
                }
                ClickAction::SendButton => {
                    let text = state.entry_text.borrow().trim().to_string();
                    if !text.is_empty() {
                        ipc::send(&OutMessage::TypedMessage { text });
                        *state.entry_text.borrow_mut() = String::new();
                    }
                }
            }
            return;
        }
    }
}

pub(crate) fn handle_scroll(state: &PillState, delta_y: f64) {
    if !state.assistant_active.get() || state.assistant_compact.get() {
        return;
    }

    let dy = delta_y * 30.0;
    let current = state.scroll_offset.get();
    let max_scroll = (state.content_height.get() - state.viewport_height.get()).max(0.0);
    let new_offset = (current + dy).clamp(0.0, max_scroll);
    state.scroll_offset.set(new_offset);
    state.should_stick.set(max_scroll - new_offset <= 32.0);
}

pub(crate) fn is_interactive_at(state: &PillState, x: f64, y: f64) -> bool {
    let s = state.ui_scale;
    let (ox, oy) = state.content_offset();
    let x = x / s - ox;
    let y = y / s - oy;
    let dw = state.draw_width.get();
    let dh = state.draw_height.get();

    if state.assistant_active.get() || state.panel_open_t.get() > 0.1 {
        return x >= 0.0 && x <= dw && y >= 0.0 && y <= dh;
    }

    // Check pill area
    let expand_t = state.expand_t.get();
    let pill_w = gfx::lerp(MIN_PILL_WIDTH, EXPANDED_PILL_WIDTH, expand_t);
    let pill_area_top = dh - PILL_AREA_HEIGHT;

    // Expanded pill hit area
    let hit_x = (dw - pill_w) / 2.0;
    if x >= hit_x && x <= hit_x + pill_w && y >= pill_area_top && y <= dh {
        return true;
    }

    // Tooltip area
    if state.tooltip_t.get() > 0.1 {
        let tooltip_w = state.tooltip_width.get();
        let tooltip_x = (dw - tooltip_w) / 2.0;
        let tooltip_y = pill_area_top - TOOLTIP_GAP - TOOLTIP_HEIGHT;
        if x >= tooltip_x && x <= tooltip_x + tooltip_w
            && y >= tooltip_y && y <= tooltip_y + TOOLTIP_HEIGHT
        {
            return true;
        }
    }

    // Cancel button
    if state.phase.get() != Phase::Idle && state.hovered.get() {
        let (pill_x, pill_y, pw, _) = pill_position(state, dw, dh);
        let cancel_x = pill_x + pw - CANCEL_BUTTON_SIZE / 2.0 + 2.0;
        let cancel_y = pill_y - CANCEL_BUTTON_SIZE / 2.0 - 2.0;
        if x >= cancel_x && x <= cancel_x + CANCEL_BUTTON_SIZE
            && y >= cancel_y && y <= cancel_y + CANCEL_BUTTON_SIZE
        {
            return true;
        }
    }

    false
}
