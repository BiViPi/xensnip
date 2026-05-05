export type ToolId = 'select' | 'arrow' | 'rectangle' | 'text' | 'blur' | 'numbered' | 'spotlight' | 'crop' | 'canvas' | 'magnify' | 'simplify_ui' | 'pixel_ruler';

export interface BaseObject {
  id: string;
  type: ToolId;
  x: number;
  y: number;
  rotation: number;
  draggable: boolean;
}

export interface ArrowObject extends BaseObject {
  type: 'arrow';
  points: [number, number, number, number]; // [x1, y1, x2, y2]
  stroke: string;
  strokeWidth: number;
  pointerLength: number;
  pointerWidth: number;
  style: 'solid' | 'dashed';
}

export interface RectangleObject extends BaseObject {
  type: 'rectangle';
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  lineStyle: 'solid' | 'dashed' | 'cloud';
  cornerRadius: number;
}

export interface TextObject extends BaseObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle: string; // 'normal' | 'bold'
  align: 'left' | 'center' | 'right';
  padding: number;
}

export interface BlurObject extends BaseObject {
  type: 'blur';
  width: number;
  height: number;
  blurRadius: number;
}

export interface NumberedObject extends BaseObject {
  type: 'numbered';
  displayNumber: number;
  radius: number;
  fill: string;
}

export interface SpotlightObject extends BaseObject {
  type: 'spotlight';
  width: number;
  height: number;
  opacity: number;
  cornerRadius: number;
}

export interface MagnifyObject extends BaseObject {
  type: 'magnify';
  width: number;
  height: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  zoom: number;
  cornerRadius: number;
  borderOpacity: number;
}

export interface SimplifyUiObject extends BaseObject {
  type: 'simplify_ui';
  width: number;
  height: number;
  dimOpacity: number;
  blurRadius: number;
  saturation: number;
  cornerRadius: number;
}

export interface PixelRulerObject extends BaseObject {
  type: 'pixel_ruler';
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
  labelFill: string;
  showBackground: boolean;
}

export type AnnotateObject = ArrowObject | RectangleObject | TextObject | BlurObject | NumberedObject | SpotlightObject | MagnifyObject | SimplifyUiObject | PixelRulerObject;
