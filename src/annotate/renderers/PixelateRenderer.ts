import { PixelateObject } from "../state/types";

export interface SampleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Samples `sourceRect` from `sourceCanvas` into an offscreen `outWidth x outHeight` canvas
 * and applies alpha-weighted box-averaged mosaic tiling so thin UI text produces
 * distinct, legible pixel blocks instead of collapsing to background samples.
 */
export function createPixelatedCanvas(
  sourceCanvas: HTMLCanvasElement,
  sourceRect: SampleRect,
  outWidth: number,
  outHeight: number,
  pixelSize: number
): HTMLCanvasElement | null {
  if (
    outWidth <= 0 ||
    outHeight <= 0 ||
    sourceRect.width <= 0 ||
    sourceRect.height <= 0 ||
    sourceCanvas.width <= 0 ||
    sourceCanvas.height <= 0
  ) {
    return null;
  }

  const w = Math.max(1, Math.round(outWidth));
  const h = Math.max(1, Math.round(outHeight));
  const ps = Math.max(1, Math.round(pixelSize));

  const sx0 = Math.max(0, Math.min(sourceCanvas.width, sourceRect.x));
  const sy0 = Math.max(0, Math.min(sourceCanvas.height, sourceRect.y));
  const sx1 = Math.max(sx0, Math.min(sourceCanvas.width, sourceRect.x + sourceRect.width));
  const sy1 = Math.max(sy0, Math.min(sourceCanvas.height, sourceRect.y + sourceRect.height));
  if (sx1 <= sx0 || sy1 <= sy0) {
    return null;
  }

  const snap = document.createElement('canvas');
  snap.width = w;
  snap.height = h;
  const snapCtx = snap.getContext('2d');
  if (!snapCtx) return null;

  snapCtx.imageSmoothingEnabled = true;
  const dx = ((sx0 - sourceRect.x) / sourceRect.width) * w;
  const dy = ((sy0 - sourceRect.y) / sourceRect.height) * h;
  const dw = ((sx1 - sx0) / sourceRect.width) * w;
  const dh = ((sy1 - sy0) / sourceRect.height) * h;
  snapCtx.drawImage(sourceCanvas, sx0, sy0, sx1 - sx0, sy1 - sy0, dx, dy, dw, dh);

  const src = snapCtx.getImageData(0, 0, w, h).data;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return null;

  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  for (let by = 0; by < h; by += ps) {
    const yEnd = Math.min(h, by + ps);
    for (let bx = 0; bx < w; bx += ps) {
      const xEnd = Math.min(w, bx + ps);
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;

      for (let py = by; py < yEnd; py++) {
        let idx = (py * w + bx) * 4;
        for (let px = bx; px < xEnd; px++) {
          const a = src[idx + 3];
          rSum += src[idx] * a;
          gSum += src[idx + 1] * a;
          bSum += src[idx + 2] * a;
          aSum += a;
          count++;
          idx += 4;
        }
      }

      const aAvg = count > 0 ? Math.round(aSum / count) : 0;
      const rAvg = aSum > 0 ? Math.round(rSum / aSum) : 0;
      const gAvg = aSum > 0 ? Math.round(gSum / aSum) : 0;
      const bAvg = aSum > 0 ? Math.round(bSum / aSum) : 0;

      for (let py = by; py < yEnd; py++) {
        let idx = (py * w + bx) * 4;
        for (let px = bx; px < xEnd; px++) {
          dst[idx] = rAvg;
          dst[idx + 1] = gAvg;
          dst[idx + 2] = bAvg;
          dst[idx + 3] = aAvg;
          idx += 4;
        }
      }
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

export function renderPixelate(
  ctx: CanvasRenderingContext2D,
  obj: PixelateObject,
  sourceCanvas: HTMLCanvasElement
) {
  const { x, y, width, height, pixelSize, rotation } = obj;
  if (width <= 0 || height <= 0) return;

  ctx.save();
  try {
    const outCanvas = createPixelatedCanvas(
      sourceCanvas,
      { x, y, width, height },
      width,
      height,
      pixelSize
    );
    if (!outCanvas) return;

    if (rotation !== 0) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }

    ctx.drawImage(outCanvas, x, y, width, height);

    if (obj.borderWidth > 0) {
      ctx.strokeStyle = obj.borderColor;
      ctx.lineWidth = obj.borderWidth;
      ctx.strokeRect(x, y, width, height);
    }
  } finally {
    ctx.restore();
  }
}
