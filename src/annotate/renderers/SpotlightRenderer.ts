import { SpotlightObject } from '../state/types';
import { addSpotlightRoundedRectPath, getSpotlightCornerRadius } from './spotlightLayout';

export type SpotlightMaskItem = Pick<
  SpotlightObject,
  'x' | 'y' | 'width' | 'height' | 'opacity' | 'cornerRadius' | 'rotation'
>;

function traceSpotlightPath(ctx: CanvasRenderingContext2D, s: SpotlightMaskItem) {
  const r = getSpotlightCornerRadius(s);
  ctx.save();
  if (s.rotation !== 0) {
    const cx = s.x + s.width / 2;
    const cy = s.y + s.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  ctx.beginPath();
  addSpotlightRoundedRectPath(ctx, s.x, s.y, s.width, s.height, r);
  ctx.restore();
}

/**
 * Renders all active spotlights onto a single isolated offscreen mask canvas so `destination-out`
 * punches cutouts ONLY out of the dim backdrop without erasing underlying annotations or
 * leaking editor-only indigo/cyan selection glow into exports.
 */
export function renderSpotlightMaskCanvas(
  spotlights: SpotlightMaskItem[],
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (spotlights.length === 0 || width <= 0 || height <= 0) return null;

  const canvasW = Math.max(1, Math.round(width));
  const canvasH = Math.max(1, Math.round(height));
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvasW;
  maskCanvas.height = canvasH;

  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return null;

  const effectiveOpacity = spotlights.reduce((max, item) => Math.max(max, item.opacity), 0);

  maskCtx.fillStyle = `rgba(2, 6, 23, ${effectiveOpacity})`;
  maskCtx.fillRect(0, 0, canvasW, canvasH);

  // Punch all spotlight cutouts simultaneously inside this isolated canvas
  maskCtx.save();
  maskCtx.globalCompositeOperation = 'destination-out';
  maskCtx.fillStyle = '#000';
  for (const item of spotlights) {
    if (item.width <= 0 || item.height <= 0) continue;
    traceSpotlightPath(maskCtx, item);
    maskCtx.fill();
  }
  maskCtx.restore();

  // Subtle neutral white rim only (never indigo/cyan selection outline)
  maskCtx.save();
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  maskCtx.lineWidth = 1;
  for (const item of spotlights) {
    if (item.width <= 0 || item.height <= 0) continue;
    traceSpotlightPath(maskCtx, item);
    maskCtx.stroke();
  }
  maskCtx.restore();

  return maskCanvas;
}

export function renderSpotlights(
  ctx: CanvasRenderingContext2D,
  spotlights: SpotlightMaskItem[],
  width: number,
  height: number
) {
  const maskCanvas = renderSpotlightMaskCanvas(spotlights, width, height);
  if (!maskCanvas) return;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(maskCanvas, 0, 0, width, height);
  ctx.restore();
}
