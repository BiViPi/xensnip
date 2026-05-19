import type { PresentationMode, StudioPreset } from '../studio/types';
export type { PresentationMode, StudioPreset };

// Re-export studio types used in preset so callers import from one place
export type { FrameFamily, ViewMode, FrameStyle } from '../studio/types';

export const DEFAULT_STUDIO_PRESET: StudioPreset = {
  frame_family:  'browser',
  view_mode:     'Front',
  background_id: 'desk-light',
  frame_style:   'gloss-black',

  // Geometry Defaults
  corner_radius: 0.12,
  depth:         0.05,
  bevel:         0.012,
  frame_scale:   1.0,
  frame_rotation: 0,
  frame_offset_x: 0,
  frame_offset_y: 0,

  // Shadow Defaults
  shadow_enabled:   true,
  shadow_intensity: 0.38,
  shadow_angle:     26,
  shadow_blur:      32,
  shadow_opacity:   0.38,
};

// Static imports for wallpapers ensure Vite bundles them correctly
import wp1 from "../assets/wallpapers/wp-1.webp";
import wp2 from "../assets/wallpapers/wp-2.webp";
import wp3 from "../assets/wallpapers/wp-3.webp";
import wp4 from "../assets/wallpapers/wp-4.webp";
import wp5 from "../assets/wallpapers/wp-5.webp";
import wp6 from "../assets/wallpapers/wp-6.webp";
import wp7 from "../assets/wallpapers/wp-7.webp";
import wp8 from "../assets/wallpapers/wp-8.webp";

export type BackgroundMode = "Wallpaper" | "Gradient" | "Solid";
export type GradientType = "Linear" | "Radial";

export type RatioOption = "Auto" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
export interface EditorPreset {
  background: string;

  bg_mode: BackgroundMode;
  bg_value: string;
  bg_colors: string[];
  bg_gradient_type: GradientType;
  bg_angle: number;
  bg_radius: number;

  ratio: RatioOption;
  padding: number;
  radius: number;

  // New Dynamic Shadow System
  shadow_enabled: boolean;
  shadow_blur: number;
  shadow_opacity: number;
  shadow_angle: number;
  shadow_offset: number;

  border_width: number;
  border_color: string;

  // Presentation mode
  presentation_mode: PresentationMode;
  studio?: StudioPreset;
}

export const WALLPAPER_MAP: Record<string, string> = {
  "wp-1": wp1,
  "wp-2": wp2,
  "wp-3": wp3,
  "wp-4": wp4,
  "wp-5": wp5,
  "wp-6": wp6,
  "wp-7": wp7,
  "wp-8": wp8,
};

export const WALLPAPER_PRESETS = [
  { id: "wp-1", name: "Bloom Blue" },
  { id: "wp-2", name: "Glow Blue" },
  { id: "wp-3", name: "Flow Dark" },
  { id: "wp-4", name: "Captured" },
  { id: "wp-5", name: "Sunrise" },
  { id: "wp-6", name: "Spotlight" },
  { id: "wp-7", name: "Violet" },
  { id: "wp-8", name: "Midnight" },
];

export const GRADIENT_PRESETS = [
  ["#4158D0", "#C850C0", "#FFCC70"], // Hyper Blue
  ["#0093E9", "#80D0C7"],             // Oceanic
  ["#FBAB7E", "#F7CE68"],             // Sunset
  ["#85FFBD", "#FFFB7D"],             // Minty
  ["#FA8BFF", "#2BD2FF", "#2BFF88"], // Cosmic
  ["#08AEEA", "#2AF598"],             // Aurora
  ["#21D4FD", "#B721FF"],             // Midnight
  ["#EE9CA7", "#FFDDE1"],             // Berry
];

export const SOLID_PRESETS = [
  "#ffffff", "#000000", "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#64748b", "#1e293b"
];

export const DEFAULT_PRESET: EditorPreset = {
  background: "XenSnip Blue",

  bg_mode: "Gradient",
  bg_value: "wp-1",
  bg_colors: ["#4158D0", "#C850C0", "#FFCC70"],
  bg_gradient_type: "Linear",
  bg_angle: 135,
  bg_radius: 50,

  ratio: "16:9",
  padding: 32,
  radius: 12,
  
  shadow_enabled: true,
  shadow_blur: 40,
  shadow_opacity: 0.5,
  shadow_angle: 135,
  shadow_offset: 20,
  border_width: 12,
  border_color: "rgba(15, 23, 42, 0.8)",

  presentation_mode: 'flat',
  studio: undefined,
};

/**
 * Merges persisted JSON with DEFAULT_PRESET so old saves without
 * presentation_mode (or any future new field) default gracefully.
 */
export function normalizeEditorPreset(raw: unknown): EditorPreset {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_PRESET };
  const base = { ...DEFAULT_PRESET, ...(raw as Partial<EditorPreset>) };
  if (base.studio) {
    // Sanitize studio properties to prevent old keys (like content_scale) from leaking
    const sanitizedStudio = { ...DEFAULT_STUDIO_PRESET };
    const rawStudio = base.studio as any;
    const knownKeys: (keyof StudioPreset)[] = [
      'frame_family',
      'view_mode',
      'background_id',
      'frame_style',
      'corner_radius',
      'depth',
      'bevel',
      'frame_scale',
      'frame_rotation',
      'frame_offset_x',
      'frame_offset_y',
      'shadow_enabled',
      'shadow_intensity',
      'shadow_angle',
      'shadow_blur',
      'shadow_opacity'
    ];
    for (const key of knownKeys) {
      if (rawStudio[key] !== undefined) {
        (sanitizedStudio as any)[key] = rawStudio[key];
      }
    }
    base.studio = sanitizedStudio;
  }
  return base;
}
