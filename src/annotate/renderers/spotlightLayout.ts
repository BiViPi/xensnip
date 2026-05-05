import { SpotlightObject } from '../state/types';

export interface SpotlightOverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getSpotlightOverlayRects(
  obj: SpotlightObject,
  stageWidth: number,
  stageHeight: number
): SpotlightOverlayRect[] {
  const left = clamp(obj.x, 0, stageWidth);
  const top = clamp(obj.y, 0, stageHeight);
  const right = clamp(obj.x + obj.width, 0, stageWidth);
  const bottom = clamp(obj.y + obj.height, 0, stageHeight);

  return [
    { x: 0, y: 0, width: stageWidth, height: top },
    { x: 0, y: top, width: left, height: Math.max(0, bottom - top) },
    { x: right, y: top, width: Math.max(0, stageWidth - right), height: Math.max(0, bottom - top) },
    { x: 0, y: bottom, width: stageWidth, height: Math.max(0, stageHeight - bottom) },
  ].filter((rect) => rect.width > 0 && rect.height > 0);
}

export function getSpotlightCornerRadius(obj: SpotlightObject) {
  return Math.min(obj.cornerRadius, obj.width / 2, obj.height / 2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
