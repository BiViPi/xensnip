import type * as THREE from 'three';

export type PresentationMode = 'flat' | 'studio';

/** v0.4.0: only 'browser' and 'acrylic'. Extended in later versions. */
export type FrameFamily = 'browser' | 'acrylic';

export type ViewMode = 'Left' | 'Front' | 'Right';

export type FrameStyle =
  | 'gloss-black'
  | 'matte-black'
  | 'gloss-white'
  | 'matte-white';

export interface StudioLightConfig {
  color:    number;
  intensity: number;
  position: [number, number, number];
}

export interface StudioShadowConfig {
  intensity: number;
  angle:     number;
}

export interface StudioBackground {
  id:       string;
  label:    string;
  imageSrc: string;
  tone:     'light' | 'dark';
  light:    StudioLightConfig;
  shadow:   StudioShadowConfig;
}

export interface StudioPreset {
  frame_family:  FrameFamily;
  view_mode:     ViewMode;
  background_id: string;
  frame_style:   FrameStyle;

  // Geometry Controls
  corner_radius: number;
  depth:         number;
  bevel:         number;
  frame_scale:   number;
  frame_rotation: number;
  frame_offset_x: number;
  frame_offset_y: number;

  // Shadow Controls
  shadow_enabled:   boolean;
  shadow_intensity: number;
  shadow_angle:     number;
  shadow_blur:      number;
  shadow_opacity:   number;
}

export interface StudioGeometryParams {
  width:        number;
  height:       number;
  depth:        number;
  cornerRadius: number;
  bevel:        number;
}

/** Implemented by each frame family. Add new families without touching this interface. */
export interface FrameRenderer {
  buildGeometry(params: StudioGeometryParams): THREE.BufferGeometry;
  buildMaterial(style: FrameStyle): THREE.Material | THREE.Material[];
  getActualDepth(params: StudioGeometryParams): number;
  /** True if this family draws a macOS browser title bar on the screen texture */
  hasTitleBar: boolean;
}

export interface StudioRenderConfig {
  frameFamily:     FrameFamily;
  frameStyle:      FrameStyle;
  viewMode:        ViewMode;
  background:      StudioBackground;
  screenshotImage: HTMLImageElement;

  // New geometry & scale fields
  cornerRadius:    number;
  depth:           number;
  bevel:           number;
  frameScale:      number;
  frameRotation:   number;
  frameOffsetX:    number;
  frameOffsetY:    number;

  // New shadow fields
  shadowEnabled:   boolean;
  shadowIntensity: number;
  shadowAngle:     number;
  shadowBlur:      number;
  shadowOpacity:   number;
}

/** Handle passed to QuickBar so it can trigger export without owning the renderer */
export interface StudioExportHandle {
  exportPng(targetWidth: number, targetHeight: number): Promise<string>;
  readonly isReady: boolean;
}
