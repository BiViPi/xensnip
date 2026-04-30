export type BackgroundStyle =
  | "Transparent"
  | "Fluent Mesh"
  | "Electric Cyan"
  | "Modern Teal"
  | "Sunset Peach"
  | "Snow White";

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
  background: "Fluent Mesh",
  ratio: "16:9",
  padding: 32, // Base padding, auto-balance might adjust this
  inset: 0,
  radius: 12,
  shadow: "Medium",
};

export const BACKGROUND_CONFIGS: Record<BackgroundStyle, string | string[]> = {
  Transparent: "transparent",
  "Fluent Mesh": ["#4f46e5", "#7c3aed", "#2563eb"], // Placeholder for gradient
  "Electric Cyan": ["#06b6d4", "#3b82f6"],
  "Modern Teal": ["#0d9488", "#10b981"],
  "Sunset Peach": ["#f43f5e", "#fb923c"],
  "Snow White": "#ffffff",
};
