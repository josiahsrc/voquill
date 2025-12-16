use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextSelection {
    pub full_text: String,
    pub selected_text: String,
    pub start_index: usize,
    pub length: usize,
}

impl TextSelection {
    pub fn new(
        full_text: String,
        selected_text: String,
        start_index: usize,
        length: usize,
    ) -> Self {
        Self {
            full_text,
            selected_text,
            start_index,
            length,
        }
    }

    pub fn empty() -> Self {
        Self {
            full_text: String::new(),
            selected_text: String::new(),
            start_index: 0,
            length: 0,
        }
    }
}
