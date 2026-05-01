export type BackgroundMode = "Wallpaper" | "Gradient" | "Solid";
export type GradientType = "Linear" | "Radial";

export type RatioOption = "Free" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
export type ShadowStyle = "None" | "Small" | "Medium" | "Large";

export interface EditorPreset {
  // Appearance (Legacy field kept for simple theme-sync if needed, but primary is bg_*)
  background: string; 
  
  // NEW Background Model
  bg_mode: BackgroundMode;
  bg_value: string; // Wallpaper ID or Solid Hex
  bg_colors: string[]; // Gradient stops
  bg_gradient_type: GradientType;
  bg_angle: number;
  bg_radius: number;

  ratio: RatioOption;
  padding: number;
  inset: number;
  radius: number;
  shadow: ShadowStyle;
}

export const WALLPAPER_PRESETS = [
  { id: "wp-1", colors: ["#3b82f6", "#1d4ed8"] }, // Will be rendered as mesh/image in future
  { id: "wp-2", colors: ["#8b5cf6", "#4c1d95"] },
  { id: "wp-3", colors: ["#10b981", "#064e3b"] },
  { id: "wp-4", colors: ["#f43f5e", "#881337"] },
  { id: "wp-5", colors: ["#f59e0b", "#78350f"] },
  { id: "wp-6", colors: ["#06b6d4", "#083344"] },
];

export const GRADIENT_PRESETS = [
  ["#3b82f6", "#1d4ed8"],
  ["#8b5cf6", "#4c1d95"],
  ["#10b981", "#064e3b"],
  ["#f43f5e", "#881337"],
  ["#f59e0b", "#78350f"],
  ["#06b6d4", "#083344"],
  ["#ff0080", "#7928ca"],
  ["#f093fb", "#f5576c"],
];

export const SOLID_PRESETS = [
  "#ffffff", "#000000", "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#64748b", "#00000000"
];

export const DEFAULT_PRESET: EditorPreset = {
  background: "XenSnip Blue",
  
  bg_mode: "Gradient",
  bg_value: "wp-1",
  bg_colors: ["#3b82f6", "#1d4ed8"],
  bg_gradient_type: "Linear",
  bg_angle: 135,
  bg_radius: 50,

  ratio: "16:9",
  padding: 32,
  inset: 0,
  radius: 12,
  shadow: "Medium",
};

// Legacy shim for components still using BACKGROUND_CONFIGS
export const BACKGROUND_CONFIGS: Record<string, string | string[]> = {
  "XenSnip Blue": ["#3b82f6", "#1d4ed8"],
};
