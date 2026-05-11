/**
 * testPresets.ts
 *
 * The four composition variants (V1–V4) used across all fidelity matrix rows.
 * V4 deliberately uses Solid background instead of Wallpaper to avoid
 * loading binary assets during headless tests.
 */
import type { EditorPreset } from '../../compose/preset';

/** V1. Plain — no background, no padding, no shadow, no border. */
export const V1_PLAIN: EditorPreset = {
  background: 'plain',
  bg_mode: 'Solid',
  bg_value: 'transparent',
  bg_colors: ['transparent', 'transparent'],
  bg_gradient_type: 'Linear',
  bg_angle: 0,
  bg_radius: 50,
  ratio: 'Auto',
  padding: 0,
  radius: 0,
  shadow_enabled: false,
  shadow_blur: 0,
  shadow_opacity: 0,
  shadow_angle: 135,
  shadow_offset: 0,
  border_width: 0,
  border_color: 'transparent',
};

/** V2. Background — solid color background, default padding. */
export const V2_BACKGROUND: EditorPreset = {
  background: 'solid-blue',
  bg_mode: 'Solid',
  bg_value: '#1e3a5f',
  bg_colors: ['#1e3a5f', '#1e3a5f'],
  bg_gradient_type: 'Linear',
  bg_angle: 135,
  bg_radius: 50,
  ratio: 'Auto',
  padding: 32,
  radius: 0,
  shadow_enabled: false,
  shadow_blur: 0,
  shadow_opacity: 0,
  shadow_angle: 135,
  shadow_offset: 0,
  border_width: 0,
  border_color: 'transparent',
};

/** V3. Padded shadow — solid background, padding 48px, shadow blur 24px / offset 8px. */
export const V3_PADDED_SHADOW: EditorPreset = {
  background: 'solid-shadow',
  bg_mode: 'Solid',
  bg_value: '#0f172a',
  bg_colors: ['#0f172a', '#0f172a'],
  bg_gradient_type: 'Linear',
  bg_angle: 135,
  bg_radius: 50,
  ratio: 'Auto',
  padding: 48,
  radius: 8,
  shadow_enabled: true,
  shadow_blur: 24,
  shadow_opacity: 0.5,
  shadow_angle: 135,
  shadow_offset: 8,
  border_width: 0,
  border_color: 'transparent',
};

/**
 * V4. Full preset — uses Solid (deep navy) background instead of Wallpaper
 * to avoid binary asset loading in headless tests. All other preset fields
 * match a full-featured composition: padding, shadow, border radius, border.
 */
export const V4_FULL_PRESET: EditorPreset = {
  background: 'deep-navy',
  bg_mode: 'Solid',
  bg_value: '#0d1b2a',
  bg_colors: ['#0d1b2a', '#1a2e44'],
  bg_gradient_type: 'Linear',
  bg_angle: 135,
  bg_radius: 50,
  ratio: 'Auto',
  padding: 32,
  radius: 16,
  shadow_enabled: true,
  shadow_blur: 40,
  shadow_opacity: 0.5,
  shadow_angle: 135,
  shadow_offset: 20,
  border_width: 12,
  border_color: 'rgba(15, 23, 42, 0.8)',
};

export const VARIANTS = [V1_PLAIN, V2_BACKGROUND, V3_PADDED_SHADOW, V4_FULL_PRESET] as const;
export const VARIANT_NAMES = ['v1-plain', 'v2-background', 'v3-padded-shadow', 'v4-full'] as const;
