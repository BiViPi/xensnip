const MIN_SELECTION_EDGE: u32 = 10;

// ── Existing public types ─────────────────────────────────────────────────────

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
    pub(super) fn from_points(
        start_x: i32,
        start_y: i32,
        current_x: i32,
        current_y: i32,
    ) -> Option<Self> {
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

// ── New types for the Adjusting phase ────────────────────────────────────────

/// Selection stored in virtual screen (global) coordinates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct GlobalRect {
    pub gx: i32,
    pub gy: i32,
    pub gw: u32,
    pub gh: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum HandleId {
    NW,
    N,
    NE,
    W,
    E,
    SW,
    S,
    SE,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AdjustDrag {
    None,
    Handle {
        which: HandleId,
        /// Local (window-relative) cursor position at drag start.
        anchor_local: (i32, i32),
        /// Selection rect (global) captured at drag start.
        rect_at_start: GlobalRect,
    },
    Move {
        anchor_local: (i32, i32),
        rect_at_start: GlobalRect,
    },
}

/// Read-only snapshot of the current adjust drag, for use by the snap controller.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum AdjustDragSnapshot {
    None,
    Handle {
        which: HandleId,
        anchor_local: (i32, i32),
        rect_at_start: GlobalRect,
    },
    Move {
        anchor_local: (i32, i32),
        rect_at_start: GlobalRect,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct AdjustingState {
    rect: GlobalRect,
    drag: AdjustDrag,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum SelectorPhase {
    Idle,
    Selecting,
    Adjusting(AdjustingState),
}

// ── SelectorState ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub(super) struct SelectorState {
    /// Origin of the selector window in virtual screen coords.
    pub(super) virtual_x: i32,
    pub(super) virtual_y: i32,
    phase: SelectorPhase,
    /// Live drag coordinates (local) — only valid in Selecting phase.
    start_x: i32,
    start_y: i32,
    current_x: i32,
    current_y: i32,
    /// Final outcome, read by the caller after the message loop ends.
    outcome: SelectionOutcome,
}

impl SelectorState {
    pub(super) fn new(virtual_x: i32, virtual_y: i32) -> Self {
        Self {
            virtual_x,
            virtual_y,
            phase: SelectorPhase::Idle,
            start_x: 0,
            start_y: 0,
            current_x: 0,
            current_y: 0,
            outcome: SelectionOutcome::Cancelled,
        }
    }

    // ── Phase predicates ──────────────────────────────────────────────────────

    pub(super) fn is_selecting(&self) -> bool {
        self.phase == SelectorPhase::Selecting
    }

    pub(super) fn is_adjusting(&self) -> bool {
        matches!(self.phase, SelectorPhase::Adjusting(_))
    }

    pub(super) fn is_drag_active(&self) -> bool {
        matches!(
            self.phase,
            SelectorPhase::Adjusting(AdjustingState {
                drag: AdjustDrag::Handle { .. } | AdjustDrag::Move { .. },
                ..
            })
        )
    }

    pub(super) fn outcome(&self) -> &SelectionOutcome {
        &self.outcome
    }

    // ── Phase: Idle → Selecting ───────────────────────────────────────────────

    /// Called on WM_LBUTTONDOWN when idle. Begins the drag selection.
    pub(super) fn begin_selection(&mut self, x: i32, y: i32) -> SelectionAnchor {
        self.phase = SelectorPhase::Selecting;
        self.start_x = x;
        self.start_y = y;
        self.current_x = x;
        self.current_y = y;
        SelectionAnchor {
            gx: self.virtual_x + x,
            gy: self.virtual_y + y,
        }
    }

    // ── Phase: Selecting, live drag ───────────────────────────────────────────

    /// Updates the live selection rect during WM_MOUSEMOVE (Selecting phase).
    pub(super) fn update_selection(&mut self, x: i32, y: i32) -> SelectionPreview {
        let old_rect = self.current_local_rect();
        self.current_x = x;
        self.current_y = y;
        let new_rect = self.current_local_rect();
        SelectionPreview { old_rect, new_rect }
    }

    /// Returns the live selection rect in local (window-relative) coords.
    /// Only meaningful in the Selecting phase.
    pub(super) fn current_local_rect(&self) -> Option<LocalSelectionRect> {
        LocalSelectionRect::from_points(self.start_x, self.start_y, self.current_x, self.current_y)
    }

    // ── Phase: Selecting → Adjusting (WM_LBUTTONUP) ──────────────────────────

    /// Finalizes the initial drag and transitions to the Adjusting phase.
    ///
    /// Returns `true` when the rect was large enough and the phase transitioned
    /// to `Adjusting`. Returns `false` when the rect is too small; in that case
    /// `outcome` is set to `Cancelled` and the caller should destroy the window.
    pub(super) fn try_enter_adjust(&mut self, x: i32, y: i32) -> bool {
        self.current_x = x;
        self.current_y = y;

        let local = match LocalSelectionRect::from_points(
            self.start_x,
            self.start_y,
            self.current_x,
            self.current_y,
        ) {
            Some(r) => r,
            None => {
                self.outcome = SelectionOutcome::Cancelled;
                self.phase = SelectorPhase::Idle;
                return false;
            }
        };

        let gw = (local.right - local.left) as u32;
        let gh = (local.bottom - local.top) as u32;

        if gw < MIN_SELECTION_EDGE || gh < MIN_SELECTION_EDGE {
            self.outcome = SelectionOutcome::Cancelled;
            self.phase = SelectorPhase::Idle;
            return false;
        }

        let rect = GlobalRect {
            gx: self.virtual_x + local.left,
            gy: self.virtual_y + local.top,
            gw,
            gh,
        };

        self.phase = SelectorPhase::Adjusting(AdjustingState {
            rect,
            drag: AdjustDrag::None,
        });
        true
    }

    // ── Phase: Adjusting — current rect query ─────────────────────────────────

    /// Returns the current selection rect in global coordinates,
    /// or `None` if not in the Adjusting phase.
    pub(super) fn current_adjust_rect(&self) -> Option<&GlobalRect> {
        match &self.phase {
            SelectorPhase::Adjusting(s) => Some(&s.rect),
            _ => None,
        }
    }

    /// Returns a snapshot of the active adjust drag, or `None` variant when idle.
    /// Used by the snap controller to decide whether to apply snap without
    /// absorbing snap runtime into `SelectorState`.
    pub(super) fn current_adjust_drag(&self) -> AdjustDragSnapshot {
        match &self.phase {
            SelectorPhase::Adjusting(s) => match s.drag {
                AdjustDrag::None => AdjustDragSnapshot::None,
                AdjustDrag::Handle {
                    which,
                    anchor_local,
                    rect_at_start,
                } => AdjustDragSnapshot::Handle {
                    which,
                    anchor_local,
                    rect_at_start,
                },
                AdjustDrag::Move {
                    anchor_local,
                    rect_at_start,
                } => AdjustDragSnapshot::Move {
                    anchor_local,
                    rect_at_start,
                },
            },
            _ => AdjustDragSnapshot::None,
        }
    }

    /// Override the current adjust rect with a snap-corrected value.
    /// No-op when not in the Adjusting phase.
    pub(super) fn set_adjust_rect(&mut self, rect: GlobalRect) {
        if let SelectorPhase::Adjusting(ref mut s) = self.phase {
            s.rect = rect;
        }
    }

    // ── Phase: Adjusting — drag operations ───────────────────────────────────

    /// Begins a handle resize drag. Stores the anchor and the rect at drag start.
    pub(super) fn adjust_handle_begin(&mut self, which: HandleId, lx: i32, ly: i32) {
        if let SelectorPhase::Adjusting(ref s) = self.phase {
            let rect_at_start = s.rect;
            self.phase = SelectorPhase::Adjusting(AdjustingState {
                rect: rect_at_start,
                drag: AdjustDrag::Handle {
                    which,
                    anchor_local: (lx, ly),
                    rect_at_start,
                },
            });
        }
    }

    /// Begins a whole-region move drag.
    pub(super) fn adjust_move_begin(&mut self, lx: i32, ly: i32) {
        if let SelectorPhase::Adjusting(ref s) = self.phase {
            let rect_at_start = s.rect;
            self.phase = SelectorPhase::Adjusting(AdjustingState {
                rect: rect_at_start,
                drag: AdjustDrag::Move {
                    anchor_local: (lx, ly),
                    rect_at_start,
                },
            });
        }
    }

    /// Updates the selection rect based on the current cursor position.
    ///
    /// Returns `(old_local, new_local)` for targeted invalidation.
    pub(super) fn adjust_drag_update(
        &mut self,
        lx: i32,
        ly: i32,
    ) -> (Option<LocalSelectionRect>, Option<LocalSelectionRect>) {
        let vx = self.virtual_x;
        let vy = self.virtual_y;

        let old_local = self
            .current_adjust_rect()
            .map(|g| local_rect_from_global(*g, vx, vy));

        if let SelectorPhase::Adjusting(ref mut s) = self.phase {
            match s.drag {
                AdjustDrag::None => {}
                AdjustDrag::Handle {
                    which,
                    anchor_local: (ax, ay),
                    rect_at_start,
                } => {
                    let dx = lx - ax;
                    let dy = ly - ay;
                    s.rect = apply_handle_delta(rect_at_start, which, dx, dy);
                }
                AdjustDrag::Move {
                    anchor_local: (ax, ay),
                    rect_at_start,
                } => {
                    s.rect = GlobalRect {
                        gx: rect_at_start.gx + (lx - ax),
                        gy: rect_at_start.gy + (ly - ay),
                        gw: rect_at_start.gw,
                        gh: rect_at_start.gh,
                    };
                }
            }
        }

        let new_local = self
            .current_adjust_rect()
            .map(|g| local_rect_from_global(*g, vx, vy));
        (old_local, new_local)
    }

    /// Ends the active drag (clears to `AdjustDrag::None`).
    pub(super) fn adjust_drag_end(&mut self) {
        if let SelectorPhase::Adjusting(ref mut s) = self.phase {
            s.drag = AdjustDrag::None;
        }
    }

    // ── Confirm / Cancel ──────────────────────────────────────────────────────

    /// Confirms the current adjusted rect and sets the outcome. Call before
    /// `DestroyWindow`.
    pub(super) fn confirm_adjust(&mut self) {
        if let SelectorPhase::Adjusting(ref s) = self.phase {
            self.outcome = SelectionOutcome::Confirmed {
                gx: s.rect.gx,
                gy: s.rect.gy,
                gw: s.rect.gw,
                gh: s.rect.gh,
            };
        }
    }

    /// Sets outcome to Cancelled and resets to Idle. Call before `DestroyWindow`.
    pub(super) fn cancel(&mut self) {
        self.outcome = SelectionOutcome::Cancelled;
        self.phase = SelectorPhase::Idle;
    }
}

// ── Internal coordinate helpers ───────────────────────────────────────────────

/// Convert a global rect to a local (window-relative) `LocalSelectionRect`.
pub(super) fn local_rect_from_global(g: GlobalRect, vx: i32, vy: i32) -> LocalSelectionRect {
    LocalSelectionRect {
        left: g.gx - vx,
        top: g.gy - vy,
        right: g.gx - vx + g.gw as i32,
        bottom: g.gy - vy + g.gh as i32,
    }
}

/// Apply a handle drag delta to a global rect, enforcing minimum size.
fn apply_handle_delta(r: GlobalRect, which: HandleId, dx: i32, dy: i32) -> GlobalRect {
    let orig_right = r.gx + r.gw as i32;
    let orig_bottom = r.gy + r.gh as i32;
    let min = MIN_SELECTION_EDGE as i32;

    let mut gx = r.gx;
    let mut gy = r.gy;
    let mut gw = r.gw as i32;
    let mut gh = r.gh as i32;

    match which {
        HandleId::N => {
            let new_top = (r.gy + dy).min(orig_bottom - min);
            gy = new_top;
            gh = orig_bottom - gy;
        }
        HandleId::S => {
            let new_bottom = (orig_bottom + dy).max(r.gy + min);
            gh = new_bottom - gy;
        }
        HandleId::W => {
            let new_left = (r.gx + dx).min(orig_right - min);
            gx = new_left;
            gw = orig_right - gx;
        }
        HandleId::E => {
            let new_right = (orig_right + dx).max(r.gx + min);
            gw = new_right - gx;
        }
        HandleId::NW => {
            let new_top = (r.gy + dy).min(orig_bottom - min);
            let new_left = (r.gx + dx).min(orig_right - min);
            gy = new_top;
            gh = orig_bottom - gy;
            gx = new_left;
            gw = orig_right - gx;
        }
        HandleId::NE => {
            let new_top = (r.gy + dy).min(orig_bottom - min);
            let new_right = (orig_right + dx).max(r.gx + min);
            gy = new_top;
            gh = orig_bottom - gy;
            gw = new_right - gx;
        }
        HandleId::SW => {
            let new_bottom = (orig_bottom + dy).max(r.gy + min);
            let new_left = (r.gx + dx).min(orig_right - min);
            gh = new_bottom - gy;
            gx = new_left;
            gw = orig_right - gx;
        }
        HandleId::SE => {
            let new_bottom = (orig_bottom + dy).max(r.gy + min);
            let new_right = (orig_right + dx).max(r.gx + min);
            gh = new_bottom - gy;
            gw = new_right - gx;
        }
    }

    GlobalRect {
        gx,
        gy,
        gw: gw.max(min) as u32,
        gh: gh.max(min) as u32,
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── begin_selection ───────────────────────────────────────────────────────

    #[test]
    fn begin_selection_sets_anchor_and_enters_selecting_state() {
        let mut state = SelectorState::new(200, 400);
        let anchor = state.begin_selection(10, 20);
        assert_eq!(anchor, SelectionAnchor { gx: 210, gy: 420 });
        assert!(state.is_selecting());
        assert_eq!(state.current_local_rect(), None);
    }

    // ── update_selection ──────────────────────────────────────────────────────

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
                bottom: 100
            })
        );
        assert_eq!(second.old_rect, first.new_rect);
        assert_eq!(
            second.new_rect,
            Some(LocalSelectionRect {
                left: 50,
                top: 70,
                right: 120,
                bottom: 140
            })
        );
    }

    // ── try_enter_adjust ──────────────────────────────────────────────────────

    #[test]
    fn try_enter_adjust_confirms_valid_rect_with_virtual_offset() {
        let mut state = SelectorState::new(1000, 2000);
        state.begin_selection(10, 20);
        let _ = state.update_selection(40, 60);
        let ok = state.try_enter_adjust(40, 60);

        assert!(ok);
        assert!(state.is_adjusting());
        let rect = state.current_adjust_rect().unwrap();
        assert_eq!(rect.gx, 1010);
        assert_eq!(rect.gy, 2020);
        assert_eq!(rect.gw, 30);
        assert_eq!(rect.gh, 40);
    }

    #[test]
    fn try_enter_adjust_normalizes_reverse_drag() {
        let mut state = SelectorState::new(-1920, 0);
        state.begin_selection(100, 200);
        let ok = state.try_enter_adjust(10, 50);

        assert!(ok);
        let rect = state.current_adjust_rect().unwrap();
        assert_eq!(rect.gx, -1910); // -1920 + 10
        assert_eq!(rect.gy, 50);
        assert_eq!(rect.gw, 90);
        assert_eq!(rect.gh, 150);
    }

    #[test]
    fn try_enter_adjust_rejects_tiny_region() {
        let mut state = SelectorState::new(0, 0);
        state.begin_selection(10, 10);
        let ok = state.try_enter_adjust(15, 18);

        assert!(!ok);
        assert_eq!(state.outcome(), &SelectionOutcome::Cancelled);
        assert!(!state.is_adjusting());
    }

    #[test]
    fn try_enter_adjust_rejects_zero_size_rect() {
        let mut state = SelectorState::new(0, 0);
        state.begin_selection(50, 50);
        let ok = state.try_enter_adjust(50, 50);

        assert!(!ok);
        assert_eq!(state.outcome(), &SelectionOutcome::Cancelled);
    }

    // ── confirm_adjust / cancel ───────────────────────────────────────────────

    #[test]
    fn confirm_adjust_sets_confirmed_outcome() {
        let mut state = SelectorState::new(100, 200);
        state.begin_selection(10, 20);
        state.try_enter_adjust(60, 80);
        state.confirm_adjust();

        assert_eq!(
            state.outcome(),
            &SelectionOutcome::Confirmed {
                gx: 110,
                gy: 220,
                gw: 50,
                gh: 60
            }
        );
    }

    #[test]
    fn cancel_sets_cancelled_outcome_from_any_phase() {
        let mut state = SelectorState::new(0, 0);
        state.begin_selection(30, 40);
        let _ = state.update_selection(60, 90);
        state.cancel();

        assert!(!state.is_selecting()); // cancel does not change phase here; that's fine
        assert_eq!(state.outcome(), &SelectionOutcome::Cancelled);
    }

    // ── adjust_drag_update ────────────────────────────────────────────────────

    #[test]
    fn adjust_drag_update_n_handle_moves_top_edge_only() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_handle_begin(HandleId::N, 150, 100);
        state.adjust_drag_update(150, 80); // dy = -20
        let rect = *state.current_adjust_rect().unwrap();
        // top moves up by 20, bottom unchanged
        assert_eq!(rect.gy, 80);
        assert_eq!(rect.gh, 120);
        assert_eq!(rect.gx, 100);
        assert_eq!(rect.gw, 100);
    }

    #[test]
    fn adjust_drag_update_s_handle_moves_bottom_edge_only() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_handle_begin(HandleId::S, 150, 200);
        state.adjust_drag_update(150, 220); // dy = +20
        let rect = *state.current_adjust_rect().unwrap();
        assert_eq!(rect.gy, 100);
        assert_eq!(rect.gh, 120);
    }

    #[test]
    fn adjust_drag_update_e_handle_moves_right_edge_only() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_handle_begin(HandleId::E, 200, 150);
        state.adjust_drag_update(230, 150); // dx = +30
        let rect = *state.current_adjust_rect().unwrap();
        assert_eq!(rect.gx, 100);
        assert_eq!(rect.gw, 130);
    }

    #[test]
    fn adjust_drag_update_w_handle_moves_left_edge_only() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_handle_begin(HandleId::W, 100, 150);
        state.adjust_drag_update(80, 150); // dx = -20
        let rect = *state.current_adjust_rect().unwrap();
        assert_eq!(rect.gx, 80);
        assert_eq!(rect.gw, 120);
    }

    #[test]
    fn adjust_drag_update_se_handle_moves_bottom_right() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_handle_begin(HandleId::SE, 200, 200);
        state.adjust_drag_update(220, 210);
        let rect = *state.current_adjust_rect().unwrap();
        assert_eq!(rect.gx, 100);
        assert_eq!(rect.gy, 100);
        assert_eq!(rect.gw, 120);
        assert_eq!(rect.gh, 110);
    }

    #[test]
    fn adjust_drag_update_nw_handle_moves_top_left() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_handle_begin(HandleId::NW, 100, 100);
        state.adjust_drag_update(80, 70); // dx=-20, dy=-30
        let rect = *state.current_adjust_rect().unwrap();
        assert_eq!(rect.gx, 80);
        assert_eq!(rect.gy, 70);
        assert_eq!(rect.gw, 120);
        assert_eq!(rect.gh, 130);
    }

    #[test]
    fn adjust_drag_update_enforces_minimum_size() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        // Move S handle way up past the top edge
        state.adjust_handle_begin(HandleId::S, 150, 200);
        state.adjust_drag_update(150, 80); // would make gh negative
        let rect = *state.current_adjust_rect().unwrap();
        assert!(rect.gh >= MIN_SELECTION_EDGE);
    }

    #[test]
    fn adjust_drag_update_move_drag_translates_rect() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_move_begin(150, 150);
        state.adjust_drag_update(170, 160); // dx=+20, dy=+10
        let rect = *state.current_adjust_rect().unwrap();
        assert_eq!(rect.gx, 120);
        assert_eq!(rect.gy, 110);
        assert_eq!(rect.gw, 100); // unchanged
        assert_eq!(rect.gh, 100);
    }

    #[test]
    fn adjust_drag_update_works_with_negative_virtual_x() {
        // Secondary monitor to the left: virtual_x = -1920
        let mut state = make_adjusting_state(-1920, 0, -1800, 100, -1700, 200);
        state.adjust_handle_begin(HandleId::E, -1700 - (-1920), 150); // local E handle
        let local_e = -1700 - (-1920); // 220 local
        state.adjust_drag_update(local_e + 20, 150);
        let rect = *state.current_adjust_rect().unwrap();
        assert_eq!(rect.gx, -1800);
        assert_eq!(rect.gw, 120); // was 100, added 20
    }

    // ── local_rect_from_global ────────────────────────────────────────────────

    #[test]
    fn local_rect_from_global_converts_correctly_with_positive_origin() {
        let g = GlobalRect {
            gx: 500,
            gy: 300,
            gw: 200,
            gh: 150,
        };
        let local = local_rect_from_global(g, 400, 200);
        assert_eq!(local.left, 100);
        assert_eq!(local.top, 100);
        assert_eq!(local.right, 300);
        assert_eq!(local.bottom, 250);
    }

    #[test]
    fn local_rect_from_global_converts_correctly_with_negative_origin() {
        let g = GlobalRect {
            gx: -1800,
            gy: 50,
            gw: 100,
            gh: 80,
        };
        let local = local_rect_from_global(g, -1920, 0);
        assert_eq!(local.left, 120);
        assert_eq!(local.top, 50);
        assert_eq!(local.right, 220);
        assert_eq!(local.bottom, 130);
    }

    // ── current_adjust_drag / set_adjust_rect ─────────────────────────────────

    #[test]
    fn current_adjust_drag_returns_none_when_idle() {
        let state = SelectorState::new(0, 0);
        assert_eq!(state.current_adjust_drag(), AdjustDragSnapshot::None);
    }

    #[test]
    fn current_adjust_drag_returns_handle_snapshot_during_handle_drag() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_handle_begin(HandleId::N, 150, 100);
        if let AdjustDragSnapshot::Handle { which, .. } = state.current_adjust_drag() {
            assert_eq!(which, HandleId::N);
        } else {
            panic!("expected Handle snapshot");
        }
    }

    #[test]
    fn current_adjust_drag_returns_move_snapshot_during_move_drag() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        state.adjust_move_begin(150, 150);
        assert!(matches!(
            state.current_adjust_drag(),
            AdjustDragSnapshot::Move { .. }
        ));
    }

    #[test]
    fn set_adjust_rect_overrides_current_rect() {
        let mut state = make_adjusting_state(0, 0, 100, 100, 200, 200);
        let new_rect = GlobalRect {
            gx: 50,
            gy: 60,
            gw: 80,
            gh: 70,
        };
        state.set_adjust_rect(new_rect);
        assert_eq!(state.current_adjust_rect().copied(), Some(new_rect));
    }

    #[test]
    fn set_adjust_rect_is_noop_when_not_adjusting() {
        let mut state = SelectorState::new(0, 0);
        state.set_adjust_rect(GlobalRect {
            gx: 0,
            gy: 0,
            gw: 100,
            gh: 100,
        });
        assert!(state.current_adjust_rect().is_none());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// Build a `SelectorState` already in the Adjusting phase with the given
    /// global rect. `vx/vy` is the virtual origin; `gx/gy` is the global top-left;
    /// `gx2/gy2` is the global bottom-right.
    fn make_adjusting_state(
        vx: i32,
        vy: i32,
        gx: i32,
        gy: i32,
        gx2: i32,
        gy2: i32,
    ) -> SelectorState {
        let lx = gx - vx;
        let ly = gy - vy;
        let lx2 = gx2 - vx;
        let ly2 = gy2 - vy;
        let mut state = SelectorState::new(vx, vy);
        state.begin_selection(lx, ly);
        let entered = state.try_enter_adjust(lx2, ly2);
        assert!(entered, "make_adjusting_state: rect too small");
        state
    }
}
