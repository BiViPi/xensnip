const MIN_SELECTION_EDGE: u32 = 10;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SelectionOutcome {
    Confirmed { gx: i32, gy: i32, gw: u32, gh: u32 },
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct LocalSelectionRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl LocalSelectionRect {
    fn from_points(start_x: i32, start_y: i32, current_x: i32, current_y: i32) -> Option<Self> {
        let left = start_x.min(current_x);
        let top = start_y.min(current_y);
        let right = start_x.max(current_x);
        let bottom = start_y.max(current_y);

        if right <= left || bottom <= top {
            return None;
        }

        Some(Self {
            left,
            top,
            right,
            bottom,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct SelectionAnchor {
    pub gx: i32,
    pub gy: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct SelectionPreview {
    pub old_rect: Option<LocalSelectionRect>,
    pub new_rect: Option<LocalSelectionRect>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct SelectionFinalize {
    pub old_rect: Option<LocalSelectionRect>,
    pub new_rect: Option<LocalSelectionRect>,
    pub outcome: SelectionOutcome,
}

#[derive(Debug, Clone)]
pub(super) struct SelectorState {
    virtual_x: i32,
    virtual_y: i32,
    selecting: bool,
    start_x: i32,
    start_y: i32,
    current_x: i32,
    current_y: i32,
    outcome: SelectionOutcome,
}

impl SelectorState {
    pub(super) fn new(virtual_x: i32, virtual_y: i32) -> Self {
        Self {
            virtual_x,
            virtual_y,
            selecting: false,
            start_x: 0,
            start_y: 0,
            current_x: 0,
            current_y: 0,
            outcome: SelectionOutcome::Cancelled,
        }
    }

    pub(super) fn is_selecting(&self) -> bool {
        self.selecting
    }

    pub(super) fn outcome(&self) -> &SelectionOutcome {
        &self.outcome
    }

    pub(super) fn current_rect(&self) -> Option<LocalSelectionRect> {
        LocalSelectionRect::from_points(self.start_x, self.start_y, self.current_x, self.current_y)
    }

    pub(super) fn begin_selection(&mut self, x: i32, y: i32) -> SelectionAnchor {
        self.selecting = true;
        self.start_x = x;
        self.start_y = y;
        self.current_x = x;
        self.current_y = y;

        SelectionAnchor {
            gx: self.virtual_x + x,
            gy: self.virtual_y + y,
        }
    }

    pub(super) fn update_selection(&mut self, x: i32, y: i32) -> SelectionPreview {
        let old_rect = self.current_rect();
        self.current_x = x;
        self.current_y = y;
        let new_rect = self.current_rect();

        SelectionPreview { old_rect, new_rect }
    }

    pub(super) fn finish_selection(&mut self, x: i32, y: i32) -> SelectionFinalize {
        let preview = self.update_selection(x, y);
        self.selecting = false;

        let gx = self.virtual_x + self.start_x.min(self.current_x);
        let gy = self.virtual_y + self.start_y.min(self.current_y);
        let gw = (self.current_x - self.start_x).unsigned_abs();
        let gh = (self.current_y - self.start_y).unsigned_abs();

        let outcome = if gw >= MIN_SELECTION_EDGE && gh >= MIN_SELECTION_EDGE {
            SelectionOutcome::Confirmed { gx, gy, gw, gh }
        } else {
            SelectionOutcome::Cancelled
        };
        self.outcome = outcome.clone();

        SelectionFinalize {
            old_rect: preview.old_rect,
            new_rect: preview.new_rect,
            outcome,
        }
    }

    pub(super) fn cancel(&mut self) {
        self.selecting = false;
        self.outcome = SelectionOutcome::Cancelled;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn begin_selection_sets_anchor_and_enters_selecting_state() {
        let mut state = SelectorState::new(200, 400);

        let anchor = state.begin_selection(10, 20);

        assert_eq!(anchor, SelectionAnchor { gx: 210, gy: 420 });
        assert!(state.is_selecting());
        assert_eq!(state.current_rect(), None);
    }

    #[test]
    fn finish_selection_confirms_second_click_with_virtual_offset() {
        let mut state = SelectorState::new(1000, 2000);
        state.begin_selection(10, 20);

        let result = state.finish_selection(40, 60);

        assert!(!state.is_selecting());
        assert_eq!(
            result.outcome,
            SelectionOutcome::Confirmed {
                gx: 1010,
                gy: 2020,
                gw: 30,
                gh: 40,
            }
        );
        assert_eq!(state.outcome(), &result.outcome);
    }

    #[test]
    fn finish_selection_normalizes_reverse_drag() {
        let mut state = SelectorState::new(-1920, 0);
        state.begin_selection(100, 200);

        let result = state.finish_selection(10, 50);

        assert_eq!(
            result.new_rect,
            Some(LocalSelectionRect {
                left: 10,
                top: 50,
                right: 100,
                bottom: 200,
            })
        );
        assert_eq!(
            result.outcome,
            SelectionOutcome::Confirmed {
                gx: -1910,
                gy: 50,
                gw: 90,
                gh: 150,
            }
        );
    }

    #[test]
    fn finish_selection_rejects_tiny_region() {
        let mut state = SelectorState::new(0, 0);
        state.begin_selection(10, 10);

        let result = state.finish_selection(15, 18);

        assert_eq!(result.outcome, SelectionOutcome::Cancelled);
        assert_eq!(state.outcome(), &SelectionOutcome::Cancelled);
    }

    #[test]
    fn cancel_clears_active_selection_and_sets_cancelled_outcome() {
        let mut state = SelectorState::new(0, 0);
        state.begin_selection(30, 40);
        let _ = state.update_selection(60, 90);

        state.cancel();

        assert!(!state.is_selecting());
        assert_eq!(state.outcome(), &SelectionOutcome::Cancelled);
        assert_eq!(
            state.current_rect(),
            Some(LocalSelectionRect {
                left: 30,
                top: 40,
                right: 60,
                bottom: 90,
            })
        );
    }

    #[test]
    fn update_selection_returns_old_and_new_rects() {
        let mut state = SelectorState::new(0, 0);
        state.begin_selection(50, 70);

        let first = state.update_selection(80, 100);
        let second = state.update_selection(120, 140);

        assert_eq!(first.old_rect, None);
        assert_eq!(
            first.new_rect,
            Some(LocalSelectionRect {
                left: 50,
                top: 70,
                right: 80,
                bottom: 100,
            })
        );
        assert_eq!(second.old_rect, first.new_rect);
        assert_eq!(
            second.new_rect,
            Some(LocalSelectionRect {
                left: 50,
                top: 70,
                right: 120,
                bottom: 140,
            })
        );
    }
}
