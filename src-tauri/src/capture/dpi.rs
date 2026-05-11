//! DPI conversion utilities for the XenSnip capture engine.
//!
//! This module is the **single source of truth** for DPI math across all capture paths.
//! All DPI values stored in [`crate::quick_access::CapturePositionMeta`] are
//! **percentages of 96 DPI** (e.g. `150` for 150% scaling, i.e. a physical DPI of 144).
//! Successful capture diagnostics use the same percentage contract; failure diagnostics
//! may log `0` when the capture exits before DPI resolution.
//!
//! Raw DPI values from `GetDpiForMonitor` / `GetDpiForWindow` must be converted via
//! [`dpi_percent_from_raw`] before being written into any metadata struct or coordinate
//! conversion call.

/// Convert a raw system DPI value (as returned by `GetDpiForMonitor` / `GetDpiForWindow`)
/// into a percentage of 96 DPI.
///
/// | Raw DPI | Percentage |
/// |---------|------------|
/// | 96      | 100        |
/// | 120     | 125        |
/// | 144     | 150        |
/// | 168     | 175        |
/// | 192     | 200        |
///
/// A `raw_dpi` of `0` is treated as `96` (system default) rather than causing a
/// division-by-zero or returning zero.
#[inline]
pub(crate) fn dpi_percent_from_raw(raw_dpi: u32) -> u32 {
    let base = if raw_dpi == 0 { 96 } else { raw_dpi };
    ((base as f64 / 96.0) * 100.0).round() as u32
}

/// Convert a physical pixel coordinate (`i32`) to a logical coordinate by dividing
/// by the DPI scale factor.
///
/// `dpi_pct` must be a **percentage** value as returned by [`dpi_percent_from_raw`]
/// (e.g. `150` for 150% scaling). Passing a raw DPI value (e.g. `144`) here would
/// produce incorrect results.
///
/// At 100% (or below) the value is returned unchanged to avoid floating-point rounding
/// on the most common case.
#[inline]
pub(crate) fn physical_to_logical_i32(value: i32, dpi_pct: u32) -> i32 {
    if dpi_pct <= 100 {
        return value;
    }
    ((value as f64) / (dpi_pct as f64 / 100.0)).round() as i32
}

/// Convert a physical pixel dimension (`u32`) to a logical dimension by dividing
/// by the DPI scale factor.
///
/// See [`physical_to_logical_i32`] for semantics of `dpi_pct`.
#[inline]
pub(crate) fn physical_to_logical_u32(value: u32, dpi_pct: u32) -> u32 {
    if dpi_pct <= 100 {
        return value;
    }
    ((value as f64) / (dpi_pct as f64 / 100.0)).round() as u32
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── dpi_percent_from_raw ─────────────────────────────────────────────────

    #[test]
    fn raw_96_yields_100_pct() {
        assert_eq!(dpi_percent_from_raw(96), 100);
    }

    #[test]
    fn raw_120_yields_125_pct() {
        assert_eq!(dpi_percent_from_raw(120), 125);
    }

    #[test]
    fn raw_144_yields_150_pct() {
        assert_eq!(dpi_percent_from_raw(144), 150);
    }

    #[test]
    fn raw_168_yields_175_pct() {
        assert_eq!(dpi_percent_from_raw(168), 175);
    }

    #[test]
    fn raw_192_yields_200_pct() {
        assert_eq!(dpi_percent_from_raw(192), 200);
    }

    /// DPI = 0 must not panic or return 0; treat as 96 → 100%.
    #[test]
    fn raw_0_fallback_yields_100_pct() {
        assert_eq!(dpi_percent_from_raw(0), 100);
    }

    /// Very high DPI (e.g. 288 for 300%) must round correctly.
    #[test]
    fn raw_288_yields_300_pct() {
        assert_eq!(dpi_percent_from_raw(288), 300);
    }

    // ── physical_to_logical_i32 ──────────────────────────────────────────────

    #[test]
    fn logical_i32_at_100_pct_is_identity() {
        assert_eq!(physical_to_logical_i32(1920, 100), 1920);
        assert_eq!(physical_to_logical_i32(0, 100), 0);
        assert_eq!(physical_to_logical_i32(-500, 100), -500);
    }

    #[test]
    fn logical_i32_at_125_pct() {
        // 2400 physical → 1920 logical
        assert_eq!(physical_to_logical_i32(2400, 125), 1920);
    }

    #[test]
    fn logical_i32_at_150_pct() {
        // 2880 physical → 1920 logical
        assert_eq!(physical_to_logical_i32(2880, 150), 1920);
    }

    #[test]
    fn logical_i32_at_175_pct() {
        // 3360 physical → 1920 logical
        assert_eq!(physical_to_logical_i32(3360, 175), 1920);
    }

    #[test]
    fn logical_i32_at_200_pct() {
        // 3840 physical → 1920 logical
        assert_eq!(physical_to_logical_i32(3840, 200), 1920);
    }

    /// Negative physical coordinates (e.g. windows on monitors to the left of origin)
    /// must be divided correctly and remain negative.
    #[test]
    fn logical_i32_negative_value_at_150_pct() {
        // -300 physical at 150% → -200 logical
        assert_eq!(physical_to_logical_i32(-300, 150), -200);
    }

    /// Zero input must remain zero at any DPI scale.
    #[test]
    fn logical_i32_zero_input() {
        assert_eq!(physical_to_logical_i32(0, 150), 0);
        assert_eq!(physical_to_logical_i32(0, 200), 0);
    }

    // ── physical_to_logical_u32 ──────────────────────────────────────────────

    #[test]
    fn logical_u32_at_100_pct_is_identity() {
        assert_eq!(physical_to_logical_u32(1920, 100), 1920);
        assert_eq!(physical_to_logical_u32(0, 100), 0);
    }

    #[test]
    fn logical_u32_at_125_pct() {
        assert_eq!(physical_to_logical_u32(2400, 125), 1920);
    }

    #[test]
    fn logical_u32_at_150_pct() {
        assert_eq!(physical_to_logical_u32(2880, 150), 1920);
    }

    #[test]
    fn logical_u32_at_175_pct() {
        assert_eq!(physical_to_logical_u32(3360, 175), 1920);
    }

    #[test]
    fn logical_u32_at_200_pct() {
        assert_eq!(physical_to_logical_u32(3840, 200), 1920);
    }

    /// Zero u32 input at any scale must remain zero.
    #[test]
    fn logical_u32_zero_input() {
        assert_eq!(physical_to_logical_u32(0, 150), 0);
        assert_eq!(physical_to_logical_u32(0, 200), 0);
    }

    // ── Bug-regression: window.rs DPI error ─────────────────────────────────

    /// Before the fix, window.rs passed raw_dpi (e.g. 144) directly as dpi_pct,
    /// causing division by 1.44 instead of 1.5 at 150%.
    /// This test proves the correct path via dpi_percent_from_raw → physical_to_logical_i32.
    #[test]
    fn window_rs_bug_regression_150pct() {
        let raw_dpi: u32 = 144; // GetDpiForWindow output at 150% scaling

        // Old (buggy) behavior: treated raw as percent → 1440 / 1.44 = 1000.0
        let buggy_result = ((1440_f64) / (raw_dpi as f64 / 100.0)).round() as i32;

        // New (correct) behavior: convert raw → pct first → 1440 / 1.5 = 960
        let dpi_pct = dpi_percent_from_raw(raw_dpi);
        let correct_result = physical_to_logical_i32(1440, dpi_pct);

        assert_eq!(dpi_pct, 150);
        assert_eq!(correct_result, 960);
        // The two must differ, proving the old code was wrong.
        assert_ne!(buggy_result, correct_result);
    }
}
