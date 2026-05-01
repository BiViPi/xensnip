export type BackgroundStyle =
  | "XenSnip Blue"
  | "Fluent Mesh"
  | "Electric Cyan"
  | "Modern Teal"
  | "Sunset Peach"
  | "Pure Black";

export type RatioOption = "Free" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16";

export type ShadowStyle = "None" | "Small" | "Medium" | "Large";

export interface EditorPreset {
  background: BackgroundStyle;
  ratio: RatioOption;
  padding: number;
  inset: number;
  radius: number;
  shadow: ShadowStyle;
}

export const DEFAULT_PRESET: EditorPreset = {
  background: "XenSnip Blue",
  ratio: "16:9",
  padding: 32,
  inset: 0,
  radius: 12,
  shadow: "Medium",
};

export const BACKGROUND_CONFIGS: Record<BackgroundStyle, string | string[]> = {
  "XenSnip Blue": ["#3b82f6", "#1d4ed8"], // Brand Accent Gradient
  "Fluent Mesh": ["#4f46e5", "#7c3aed", "#2563eb"],
  "Electric Cyan": ["#06b6d4", "#3b82f6"],
  "Modern Teal": ["#0d9488", "#10b981"],
  "Sunset Peach": ["#f43f5e", "#fb923c"],
  "Pure Black": "#000000",
};
