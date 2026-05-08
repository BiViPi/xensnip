import { ToolId } from "./state/types";
import { DrawingObject } from "./state/drawingTypes";

type DrawType = DrawingObject['type'];

export const TOOL_TO_DRAW_TYPE: Partial<Record<ToolId, DrawType>> = {
  arrow: 'arrow',
  rectangle: 'rectangle',
  blur: 'blur',
  pixelate: 'pixelate',
  opaque_redact: 'opaque_redact',
  spotlight: 'spotlight',
  magnify: 'magnify',
  simplify_ui: 'simplify_ui',
  pixel_ruler: 'pixel_ruler',
  callout: 'callout',
  freehand_arrow: 'freehand_arrow',
};
