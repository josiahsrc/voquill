use crate::whisper_state::WhisperSegment;
use crate::WhisperState;
use std::ffi::c_int;

/// An iterator over a [`WhisperState`]'s result.
pub struct WhisperStateSegmentIterator<'a> {
    state_ptr: &'a WhisperState,
    current_segment: c_int,
}

impl<'a> WhisperStateSegmentIterator<'a> {
    pub(super) fn new(state_ptr: &'a WhisperState) -> Self {
        Self {
            state_ptr,
            current_segment: 0,
        }
    }
}

impl<'a> Iterator for WhisperStateSegmentIterator<'a> {
    type Item = WhisperSegment<'a>;

    fn next(&mut self) -> Option<Self::Item> {
        let ret = self.state_ptr.get_segment(self.current_segment);
        self.current_segment += 1;
        ret
    }
}
