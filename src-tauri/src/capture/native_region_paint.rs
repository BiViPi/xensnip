use crate::capture::native_region_state::LocalSelectionRect;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct PaintRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct SelectionPaintGeometry {
    pub rect: PaintRect,
    pub label: String,
    pub label_x: i32,
    pub label_y: i32,
}

pub(super) fn selection_paint_geometry(
    rect: LocalSelectionRect,
    paint_left: i32,
    paint_top: i32,
) -> SelectionPaintGeometry {
    let offset_left = rect.left - paint_left;
    let offset_top = rect.top - paint_top;
    let offset_right = rect.right - paint_left;
    let offset_bottom = rect.bottom - paint_top;

    SelectionPaintGeometry {
        rect: PaintRect {
            left: offset_left,
            top: offset_top,
            right: offset_right,
            bottom: offset_bottom,
        },
        label: format!(
            "{} x {}",
            (rect.right - rect.left) as u32,
            (rect.bottom - rect.top) as u32
        ),
        label_x: offset_left + 5,
        label_y: (offset_top - 20).max(5),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selection_paint_geometry_offsets_rect_to_paint_origin() {
        let geometry = selection_paint_geometry(
            LocalSelectionRect {
                left: 50,
                top: 80,
                right: 150,
                bottom: 200,
            },
            10,
            20,
        );

        assert_eq!(
            geometry.rect,
            PaintRect {
                left: 40,
                top: 60,
                right: 140,
                bottom: 180,
            }
        );
        assert_eq!(geometry.label, "100 x 120");
        assert_eq!(geometry.label_x, 45);
        assert_eq!(geometry.label_y, 40);
    }

    #[test]
    fn selection_paint_geometry_clamps_label_y_to_minimum() {
        let geometry = selection_paint_geometry(
            LocalSelectionRect {
                left: 10,
                top: 18,
                right: 30,
                bottom: 48,
            },
            0,
            0,
        );

        assert_eq!(geometry.label, "20 x 30");
        assert_eq!(geometry.label_y, 5);
    }
}
