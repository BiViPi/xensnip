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

export function getSpotlightCornerRadius(obj: Pick<SpotlightObject, 'cornerRadius' | 'width' | 'height'>) {
  return Math.max(0, Math.min(obj.cornerRadius, obj.width / 2, obj.height / 2));
}

/**
 * Universal rounded-rectangle path helper compatible with both browser and headless node-canvas contexts.
 */
export function addSpotlightRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number
) {
  const r = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));
  if (r <= 0.01) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
