import { SimplifyUiObject } from '../state/types';

type CanvasWithRoundRect = CanvasRenderingContext2D & {
  roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
};

function addSimplifyUiMaskPath(ctx: CanvasRenderingContext2D, obj: SimplifyUiObject) {
  const ctxWithRoundRect = ctx as CanvasWithRoundRect;
  if (ctxWithRoundRect.roundRect) {
    ctxWithRoundRect.roundRect(obj.x, obj.y, obj.width, obj.height, obj.cornerRadius);
  } else {
    ctx.rect(obj.x, obj.y, obj.width, obj.height);
  }
}

export function createSimplifyUiOverlay(sourceCanvas: HTMLCanvasElement, obj: SimplifyUiObject): HTMLCanvasElement {
  const overlay = document.createElement('canvas');
  overlay.width = sourceCanvas.width;
  overlay.height = sourceCanvas.height;

  const overlayCtx = overlay.getContext('2d');
  if (!overlayCtx) return overlay;

  overlayCtx.save();
  overlayCtx.filter = `blur(${obj.blurRadius}px) saturate(${obj.saturation})`;
  overlayCtx.drawImage(sourceCanvas, 0, 0);
  overlayCtx.restore();

  overlayCtx.save();
  overlayCtx.fillStyle = `rgba(2, 6, 23, ${obj.dimOpacity})`;
  overlayCtx.fillRect(0, 0, overlay.width, overlay.height);
  overlayCtx.restore();

  overlayCtx.save();
  overlayCtx.globalCompositeOperation = 'destination-out';
  overlayCtx.fillStyle = '#000';
  overlayCtx.beginPath();
  addSimplifyUiMaskPath(overlayCtx, obj);
  overlayCtx.fill();
  overlayCtx.restore();

  return overlay;
}

export function renderSimplifyUi(ctx: CanvasRenderingContext2D, obj: SimplifyUiObject, sourceCanvas: HTMLCanvasElement) {
  const overlay = createSimplifyUiOverlay(sourceCanvas, obj);
  ctx.drawImage(overlay, 0, 0);
}
