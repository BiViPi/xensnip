import { MagnifyObject } from '../state/types';

export interface MagnifySampleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampMagnifyZoom(zoom: number): number {
  return Math.min(4.0, Math.max(1.0, zoom));
}

export function computeCenteredMagnifySource(
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: number
): Pick<MagnifyObject, 'zoom' | 'sourceX' | 'sourceY' | 'sourceWidth' | 'sourceHeight'> {
  const clampedZoom = clampMagnifyZoom(zoom);
  const sourceWidth = Math.max(4, width / clampedZoom);
  const sourceHeight = Math.max(4, height / clampedZoom);
  return {
    zoom: clampedZoom,
    sourceWidth,
    sourceHeight,
    sourceX: x + (width - sourceWidth) / 2,
    sourceY: y + (height - sourceHeight) / 2,
  };
}

export function syncMagnifyForDrag(
  obj: MagnifyObject,
  nextX: number,
  nextY: number
): Pick<MagnifyObject, 'x' | 'y' | 'sourceX' | 'sourceY' | 'sourceWidth' | 'sourceHeight' | 'zoom'> {
  return {
    x: nextX,
    y: nextY,
    ...computeCenteredMagnifySource(nextX, nextY, obj.width, obj.height, obj.zoom),
  };
}

export function syncMagnifyForZoom(
  obj: MagnifyObject,
  nextZoom: number
): Pick<MagnifyObject, 'zoom' | 'sourceX' | 'sourceY' | 'sourceWidth' | 'sourceHeight'> {
  return computeCenteredMagnifySource(obj.x, obj.y, obj.width, obj.height, nextZoom);
}

export function syncMagnifyForResize(
  obj: MagnifyObject,
  nextX: number,
  nextY: number,
  nextWidth: number,
  nextHeight: number,
  rotation: number
): Pick<
  MagnifyObject,
  'x' | 'y' | 'width' | 'height' | 'rotation' | 'zoom' | 'sourceX' | 'sourceY' | 'sourceWidth' | 'sourceHeight'
> {
  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
    rotation,
    ...computeCenteredMagnifySource(nextX, nextY, nextWidth, nextHeight, obj.zoom),
  };
}

function addMagnifyRoundedRectPath(
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

/**
 * Safely samples `sourceRect` from `sourceCanvas` with bounds clamping so out-of-bounds
 * positions near canvas edges never throw IndexSizeError in node-canvas or browsers.
 */
export function createMagnifySnapshotCanvas(
  sourceCanvas: HTMLCanvasElement,
  sourceRect: MagnifySampleRect,
  destWidth: number,
  destHeight: number
): HTMLCanvasElement | null {
  if (
    destWidth <= 0 ||
    destHeight <= 0 ||
    sourceRect.width <= 0 ||
    sourceRect.height <= 0 ||
    sourceCanvas.width <= 0 ||
    sourceCanvas.height <= 0
  ) {
    return null;
  }

  const outW = Math.max(1, Math.round(destWidth));
  const outH = Math.max(1, Math.round(destHeight));
  const snap = document.createElement('canvas');
  snap.width = outW;
  snap.height = outH;
  const ctx = snap.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, outW, outH);

  const sx0 = Math.max(0, sourceRect.x);
  const sy0 = Math.max(0, sourceRect.y);
  const sx1 = Math.min(sourceCanvas.width, sourceRect.x + sourceRect.width);
  const sy1 = Math.min(sourceCanvas.height, sourceRect.y + sourceRect.height);

  if (sx1 > sx0 && sy1 > sy0) {
    const scaleRatioX = outW / sourceRect.width;
    const scaleRatioY = outH / sourceRect.height;
    const dx = (sx0 - sourceRect.x) * scaleRatioX;
    const dy = (sy0 - sourceRect.y) * scaleRatioY;
    const dw = (sx1 - sx0) * scaleRatioX;
    const dh = (sy1 - sy0) * scaleRatioY;
    ctx.drawImage(sourceCanvas, sx0, sy0, sx1 - sx0, sy1 - sy0, dx, dy, dw, dh);
  }

  return snap;
}

export function renderMagnify(
  ctx: CanvasRenderingContext2D,
  obj: MagnifyObject,
  compositionCanvas: HTMLCanvasElement
) {
  if (obj.width <= 0 || obj.height <= 0 || obj.sourceWidth <= 0 || obj.sourceHeight <= 0) return;

  const zoom = clampMagnifyZoom(obj.zoom);
  const destW = Math.max(1, obj.sourceWidth * zoom);
  const destH = Math.max(1, obj.sourceHeight * zoom);
  const snapshot = createMagnifySnapshotCanvas(
    compositionCanvas,
    {
      x: obj.sourceX,
      y: obj.sourceY,
      width: obj.sourceWidth,
      height: obj.sourceHeight,
    },
    destW,
    destH
  );
  if (!snapshot) return;

  ctx.save();
  try {
    if (obj.rotation !== 0) {
      ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
      ctx.rotate((obj.rotation * Math.PI) / 180);
      ctx.translate(-(obj.x + obj.width / 2), -(obj.y + obj.height / 2));
    }

    ctx.save();
    ctx.beginPath();
    addMagnifyRoundedRectPath(ctx, obj.x, obj.y, obj.width, obj.height, obj.cornerRadius);
    ctx.clip();

    const offsetX = (destW - obj.width) / 2;
    const offsetY = (destH - obj.height) / 2;
    ctx.drawImage(snapshot, obj.x - offsetX, obj.y - offsetY, destW, destH);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    addMagnifyRoundedRectPath(ctx, obj.x, obj.y, obj.width, obj.height, obj.cornerRadius);
    ctx.strokeStyle = `rgba(255, 255, 255, ${obj.borderOpacity})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.stroke();
    ctx.restore();
  } finally {
    ctx.restore();
  }
}
