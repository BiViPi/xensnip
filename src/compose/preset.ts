import type { PresentationMode, StudioPreset } from '../studio/types';
import type { AnnotateObject } from '../annotate/state/types';
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
export interface ArrowDefaults {
  stroke: string;
  strokeWidth: number;
  pointerLength: number;
  pointerWidth: number;
  style: 'solid' | 'dashed';
}

export interface RectangleDefaults {
  stroke: string;
  strokeWidth: number;
  lineStyle: 'solid' | 'dashed' | 'cloud';
  cornerRadius: number;
}

export interface TextDefaults {
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle: string;
  align: 'left' | 'center' | 'right';
  padding: number;
}

export interface NumberedDefaults {
  radius: number;
  fill: string;
}

export interface SpotlightDefaults {
  opacity: number;
  cornerRadius: number;
}

export interface PixelRulerDefaults {
  stroke: string;
  strokeWidth: number;
  labelFill: string;
  showBackground: boolean;
}

export interface SpeechBubbleDefaults {
  stroke: string;
  fill: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  padding: number;
  cornerRadius: number;
}

export interface CalloutDefaults {
  stroke: string;
  fill: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  padding: number;
  cornerRadius: number;
  lineColor: string;
  lineWidth: number;
}

export interface FreehandArrowDefaults {
  stroke: string;
  strokeWidth: number;
}

export interface AnnotationDefaults {
  schema_version: 1;
  arrow?: ArrowDefaults;
  rectangle?: RectangleDefaults;
  text?: TextDefaults;
  numbered?: NumberedDefaults;
  spotlight?: SpotlightDefaults;
  pixel_ruler?: PixelRulerDefaults;
  speech_bubble?: SpeechBubbleDefaults;
  callout?: CalloutDefaults;
  freehand_arrow?: FreehandArrowDefaults;
}

export interface PlacedAnnotationsPreset {
  schema_version: 1;
  objects: AnnotateObject[];
}

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
  annotation_defaults?: AnnotationDefaults;
  placed_annotations?: PlacedAnnotationsPreset;
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
  annotation_defaults: undefined,
  placed_annotations: undefined,
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
  
  if (base.annotation_defaults) {
    const rawDefaults = base.annotation_defaults as any;
    const sanitizedDefaults: AnnotationDefaults = { schema_version: 1 };
    
    // Arrow
    if (typeof rawDefaults.arrow === 'object' && rawDefaults.arrow !== null) {
      const a = rawDefaults.arrow;
      const clean: Partial<ArrowDefaults> = {};
      if (typeof a.stroke === 'string') clean.stroke = a.stroke;
      if (typeof a.strokeWidth === 'number') clean.strokeWidth = a.strokeWidth;
      if (typeof a.pointerLength === 'number') clean.pointerLength = a.pointerLength;
      if (typeof a.pointerWidth === 'number') clean.pointerWidth = a.pointerWidth;
      if (a.style === 'solid' || a.style === 'dashed') clean.style = a.style;
      if (Object.keys(clean).length > 0) sanitizedDefaults.arrow = clean as ArrowDefaults;
    }
    
    // Rectangle
    if (typeof rawDefaults.rectangle === 'object' && rawDefaults.rectangle !== null) {
      const r = rawDefaults.rectangle;
      const clean: Partial<RectangleDefaults> = {};
      if (typeof r.stroke === 'string') clean.stroke = r.stroke;
      if (typeof r.strokeWidth === 'number') clean.strokeWidth = r.strokeWidth;
      if (r.lineStyle === 'solid' || r.lineStyle === 'dashed' || r.lineStyle === 'cloud') clean.lineStyle = r.lineStyle;
      if (typeof r.cornerRadius === 'number') clean.cornerRadius = r.cornerRadius;
      if (Object.keys(clean).length > 0) sanitizedDefaults.rectangle = clean as RectangleDefaults;
    }
    
    // Text
    if (typeof rawDefaults.text === 'object' && rawDefaults.text !== null) {
      const t = rawDefaults.text;
      const clean: Partial<TextDefaults> = {};
      if (typeof t.fontSize === 'number') clean.fontSize = t.fontSize;
      if (typeof t.fontFamily === 'string') clean.fontFamily = t.fontFamily;
      if (typeof t.fill === 'string') clean.fill = t.fill;
      if (typeof t.fontStyle === 'string') clean.fontStyle = t.fontStyle;
      if (t.align === 'left' || t.align === 'center' || t.align === 'right') clean.align = t.align;
      if (typeof t.padding === 'number') clean.padding = t.padding;
      if (Object.keys(clean).length > 0) sanitizedDefaults.text = clean as TextDefaults;
    }
    
    // Numbered
    if (typeof rawDefaults.numbered === 'object' && rawDefaults.numbered !== null) {
      const n = rawDefaults.numbered;
      const clean: Partial<NumberedDefaults> = {};
      if (typeof n.radius === 'number') clean.radius = n.radius;
      if (typeof n.fill === 'string') clean.fill = n.fill;
      if (Object.keys(clean).length > 0) sanitizedDefaults.numbered = clean as NumberedDefaults;
    }
    
    // Spotlight
    if (typeof rawDefaults.spotlight === 'object' && rawDefaults.spotlight !== null) {
      const s = rawDefaults.spotlight;
      const clean: Partial<SpotlightDefaults> = {};
      if (typeof s.opacity === 'number') clean.opacity = s.opacity;
      if (typeof s.cornerRadius === 'number') clean.cornerRadius = s.cornerRadius;
      if (Object.keys(clean).length > 0) sanitizedDefaults.spotlight = clean as SpotlightDefaults;
    }
    
    // Pixel Ruler
    if (typeof rawDefaults.pixel_ruler === 'object' && rawDefaults.pixel_ruler !== null) {
      const pr = rawDefaults.pixel_ruler;
      const clean: Partial<PixelRulerDefaults> = {};
      if (typeof pr.stroke === 'string') clean.stroke = pr.stroke;
      if (typeof pr.strokeWidth === 'number') clean.strokeWidth = pr.strokeWidth;
      if (typeof pr.labelFill === 'string') clean.labelFill = pr.labelFill;
      if (typeof pr.showBackground === 'boolean') clean.showBackground = pr.showBackground;
      if (Object.keys(clean).length > 0) sanitizedDefaults.pixel_ruler = clean as PixelRulerDefaults;
    }
    
    // Speech Bubble
    if (typeof rawDefaults.speech_bubble === 'object' && rawDefaults.speech_bubble !== null) {
      const sb = rawDefaults.speech_bubble;
      const clean: Partial<SpeechBubbleDefaults> = {};
      if (typeof sb.stroke === 'string') clean.stroke = sb.stroke;
      if (typeof sb.fill === 'string') clean.fill = sb.fill;
      if (typeof sb.textColor === 'string') clean.textColor = sb.textColor;
      if (typeof sb.fontSize === 'number') clean.fontSize = sb.fontSize;
      if (typeof sb.fontFamily === 'string') clean.fontFamily = sb.fontFamily;
      if (typeof sb.padding === 'number') clean.padding = sb.padding;
      if (typeof sb.cornerRadius === 'number') clean.cornerRadius = sb.cornerRadius;
      if (Object.keys(clean).length > 0) sanitizedDefaults.speech_bubble = clean as SpeechBubbleDefaults;
    }
    
    // Callout
    if (typeof rawDefaults.callout === 'object' && rawDefaults.callout !== null) {
      const co = rawDefaults.callout;
      const clean: Partial<CalloutDefaults> = {};
      if (typeof co.stroke === 'string') clean.stroke = co.stroke;
      if (typeof co.fill === 'string') clean.fill = co.fill;
      if (typeof co.textColor === 'string') clean.textColor = co.textColor;
      if (typeof co.fontSize === 'number') clean.fontSize = co.fontSize;
      if (typeof co.fontFamily === 'string') clean.fontFamily = co.fontFamily;
      if (typeof co.padding === 'number') clean.padding = co.padding;
      if (typeof co.cornerRadius === 'number') clean.cornerRadius = co.cornerRadius;
      if (typeof co.lineColor === 'string') clean.lineColor = co.lineColor;
      if (typeof co.lineWidth === 'number') clean.lineWidth = co.lineWidth;
      if (Object.keys(clean).length > 0) sanitizedDefaults.callout = clean as CalloutDefaults;
    }
    
    // Freehand Arrow
    if (typeof rawDefaults.freehand_arrow === 'object' && rawDefaults.freehand_arrow !== null) {
      const fa = rawDefaults.freehand_arrow;
      const clean: Partial<FreehandArrowDefaults> = {};
      if (typeof fa.stroke === 'string') clean.stroke = fa.stroke;
      if (typeof fa.strokeWidth === 'number') clean.strokeWidth = fa.strokeWidth;
      if (Object.keys(clean).length > 0) sanitizedDefaults.freehand_arrow = clean as FreehandArrowDefaults;
    }

    // Step 6: Redaction safeguard
    const redactionKeys = ['blur', 'pixelate', 'opaque_redact', 'smart_redact_ai'];
    for (const key of redactionKeys) {
      if (rawDefaults[key] !== undefined) {
        console.warn(`[Preset Normalizer] Stripped disallowed key '${key}' from annotation_defaults.`);
      }
    }

    base.annotation_defaults = sanitizedDefaults;
  }

  if (base.placed_annotations) {
    const rawPlaced = base.placed_annotations as any;
    const rawObjects = Array.isArray(rawPlaced?.objects) ? rawPlaced.objects : [];
    const sanitizedObjects = rawObjects
      .filter((obj: unknown): obj is Record<string, unknown> => typeof obj === 'object' && obj !== null)
      .filter(
        (obj: Record<string, unknown>) =>
          typeof obj.id === 'string' &&
          typeof obj.type === 'string' &&
          typeof obj.x === 'number' &&
          typeof obj.y === 'number' &&
          typeof obj.rotation === 'number' &&
          typeof obj.draggable === 'boolean'
      )
      .map((obj: Record<string, unknown>) => JSON.parse(JSON.stringify(obj)) as AnnotateObject);

    base.placed_annotations = {
      schema_version: 1,
      objects: sanitizedObjects,
    };
  }

  return base;
}
