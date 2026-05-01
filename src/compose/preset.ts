// Static imports for wallpapers ensure Vite bundles them correctly
import wp1 from "../assets/wallpapers/wp-1.jpg";
import wp2 from "../assets/wallpapers/wp-2.jpg";
import wp3 from "../assets/wallpapers/wp-3.jpg";
import wp4 from "../assets/wallpapers/wp-4.jpg";
import wp5 from "../assets/wallpapers/wp-5.jpg";
import wp6 from "../assets/wallpapers/wp-6.jpg";
import wp7 from "../assets/wallpapers/wp-7.jpg";
import wp8 from "../assets/wallpapers/wp-8.jpg";

export type BackgroundMode = "Wallpaper" | "Gradient" | "Solid";
export type GradientType = "Linear" | "Radial";

export type RatioOption = "Auto" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
export type ShadowStyle = "None" | "Small" | "Medium" | "Large";

export interface EditorPreset {
  background: string; 
  
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
  
  bg_mode: "Wallpaper",
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
