import { PixelateObject } from "../state/types";

export function renderPixelate(
  ctx: CanvasRenderingContext2D,
  obj: PixelateObject,
  sourceCanvas: HTMLCanvasElement
) {
  const { x, y, width, height, pixelSize, rotation } = obj;
  if (width <= 0 || height <= 0) return;

  ctx.save();

  // 1. Snapshot the source region
  const snap = document.createElement('canvas');
  snap.width = width;
  snap.height = height;
  const snapCtx = snap.getContext('2d');
  if (!snapCtx) return;

  snapCtx.drawImage(
    sourceCanvas,
    x, y, width, height,
    0, 0, width, height
  );

  // 2. Downscale to pixel-block grid
  const ps = Math.max(1, pixelSize);
  const bw = Math.max(1, Math.ceil(width / ps));
  const bh = Math.max(1, Math.ceil(height / ps));
  
  const blockCanvas = document.createElement('canvas');
  blockCanvas.width = bw;
  blockCanvas.height = bh;
  const blockCtx = blockCanvas.getContext('2d');
  if (!blockCtx) return;
  
  blockCtx.imageSmoothingEnabled = false;
  blockCtx.drawImage(snap, 0, 0, bw, bh);

  // 3. Upscale back with hard edges
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return;
  
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(blockCanvas, 0, 0, bw, bh, 0, 0, width, height);

  // 4. Render to main context with rotation
  if (rotation !== 0) {
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-(x + width / 2), -(y + height / 2));
  }

  ctx.drawImage(outCanvas, x, y);

  // 5. Border
  if (obj.borderWidth > 0) {
    ctx.strokeStyle = obj.borderColor;
    ctx.lineWidth = obj.borderWidth;
    ctx.strokeRect(x, y, width, height);
  }

  ctx.restore();
}
