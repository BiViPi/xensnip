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
};
