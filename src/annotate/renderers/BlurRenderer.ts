import { BlurObject } from '../state/types';

export interface BlurSampleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function boxesForGauss(sigma: number, n: number): number[] {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
  const m = Math.round(mIdeal);
  const sizes: number[] = [];
  for (let i = 0; i < n; i++) {
    sizes.push(Math.max(1, i < m ? wl : wu));
  }
  return sizes;
}

function boxBlurHorizontal(src: Float32Array, dst: Float32Array, w: number, h: number, radius: number) {
  if (radius <= 0) {
    dst.set(src);
    return;
  }
  const inv = 1 / (radius + radius + 1);
  for (let y = 0; y < h; y++) {
    const rowStart = y * w * 4;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sumA = 0;

    for (let k = -radius; k <= radius; k++) {
      const cx = k < 0 ? 0 : k >= w ? w - 1 : k;
      const idx = rowStart + cx * 4;
      sumR += src[idx];
      sumG += src[idx + 1];
      sumB += src[idx + 2];
      sumA += src[idx + 3];
    }

    for (let x = 0; x < w; x++) {
      const outIdx = rowStart + x * 4;
      dst[outIdx] = sumR * inv;
      dst[outIdx + 1] = sumG * inv;
      dst[outIdx + 2] = sumB * inv;
      dst[outIdx + 3] = sumA * inv;

      const remX = x - radius < 0 ? 0 : x - radius >= w ? w - 1 : x - radius;
      const addX = x + radius + 1 < 0 ? 0 : x + radius + 1 >= w ? w - 1 : x + radius + 1;
      const remIdx = rowStart + remX * 4;
      const addIdx = rowStart + addX * 4;
      sumR += src[addIdx] - src[remIdx];
      sumG += src[addIdx + 1] - src[remIdx + 1];
      sumB += src[addIdx + 2] - src[remIdx + 2];
      sumA += src[addIdx + 3] - src[remIdx + 3];
    }
  }
}

function boxBlurVertical(src: Float32Array, dst: Float32Array, w: number, h: number, radius: number) {
  if (radius <= 0) {
    dst.set(src);
    return;
  }
  const inv = 1 / (radius + radius + 1);
  const stride = w * 4;
  for (let x = 0; x < w; x++) {
    const colOffset = x * 4;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sumA = 0;

    for (let k = -radius; k <= radius; k++) {
      const cy = k < 0 ? 0 : k >= h ? h - 1 : k;
      const idx = cy * stride + colOffset;
      sumR += src[idx];
      sumG += src[idx + 1];
      sumB += src[idx + 2];
      sumA += src[idx + 3];
    }

    for (let y = 0; y < h; y++) {
      const outIdx = y * stride + colOffset;
      dst[outIdx] = sumR * inv;
      dst[outIdx + 1] = sumG * inv;
      dst[outIdx + 2] = sumB * inv;
      dst[outIdx + 3] = sumA * inv;

      const remY = y - radius < 0 ? 0 : y - radius >= h ? h - 1 : y - radius;
      const addY = y + radius + 1 < 0 ? 0 : y + radius + 1 >= h ? h - 1 : y + radius + 1;
      const remIdx = remY * stride + colOffset;
      const addIdx = addY * stride + colOffset;
      sumR += src[addIdx] - src[remIdx];
      sumG += src[addIdx + 1] - src[remIdx + 1];
      sumB += src[addIdx + 2] - src[remIdx + 2];
      sumA += src[addIdx + 3] - src[remIdx + 3];
    }
  }
}

/**
 * Produces a deterministic, halo-free blurred canvas for `sourceRect` using an expanded
 * margin on `sourceCanvas` and 3-pass separable premultiplied Gaussian blur.
 */
export function createBlurredCanvas(
  sourceCanvas: HTMLCanvasElement,
  sourceRect: BlurSampleRect,
  outWidth: number,
  outHeight: number,
  blurRadius: number
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

  if (
    sourceRect.x >= sourceCanvas.width ||
    sourceRect.y >= sourceCanvas.height ||
    sourceRect.x + sourceRect.width <= 0 ||
    sourceRect.y + sourceRect.height <= 0
  ) {
    return null;
  }

  const w = Math.max(1, Math.round(outWidth));
  const h = Math.max(1, Math.round(outHeight));
  const scaleRatioX = sourceRect.width / w;
  const scaleRatioY = sourceRect.height / h;

  const sigma = Math.max(0.6, Math.max(0, blurRadius) * 0.85);
  const margin = blurRadius > 0 ? Math.min(96, Math.ceil(sigma * 2.5)) : 0;

  const sx0 = Math.max(0, sourceRect.x - margin * scaleRatioX);
  const sy0 = Math.max(0, sourceRect.y - margin * scaleRatioY);
  const sx1 = Math.min(sourceCanvas.width, sourceRect.x + sourceRect.width + margin * scaleRatioX);
  const sy1 = Math.min(sourceCanvas.height, sourceRect.y + sourceRect.height + margin * scaleRatioY);
  if (sx1 <= sx0 || sy1 <= sy0) {
    return null;
  }

  const workW = Math.max(1, Math.round((sx1 - sx0) / scaleRatioX));
  const workH = Math.max(1, Math.round((sy1 - sy0) / scaleRatioY));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = workW;
  workCanvas.height = workH;
  const workCtx = workCanvas.getContext('2d');
  if (!workCtx) return null;

  workCtx.drawImage(sourceCanvas, sx0, sy0, sx1 - sx0, sy1 - sy0, 0, 0, workW, workH);

  if (blurRadius > 0) {
    const imgData = workCtx.getImageData(0, 0, workW, workH);
    const pixels = imgData.data;
    const len = pixels.length;
    const bufA = new Float32Array(len);
    const bufB = new Float32Array(len);

    // Premultiply RGB by alpha to prevent dark fringes near transparent pixels
    for (let i = 0; i < len; i += 4) {
      const a = pixels[i + 3];
      const alphaNorm = a / 255;
      bufA[i] = pixels[i] * alphaNorm;
      bufA[i + 1] = pixels[i + 1] * alphaNorm;
      bufA[i + 2] = pixels[i + 2] * alphaNorm;
      bufA[i + 3] = a;
    }

    const boxes = boxesForGauss(sigma, 3);
    for (const boxWidth of boxes) {
      const radius = (boxWidth - 1) >> 1;
      boxBlurHorizontal(bufA, bufB, workW, workH, radius);
      boxBlurVertical(bufB, bufA, workW, workH, radius);
    }

    for (let i = 0; i < len; i += 4) {
      const a = bufA[i + 3];
      if (a > 0.5) {
        const invAlpha = 255 / a;
        pixels[i] = Math.round(Math.min(255, Math.max(0, bufA[i] * invAlpha)));
        pixels[i + 1] = Math.round(Math.min(255, Math.max(0, bufA[i + 1] * invAlpha)));
        pixels[i + 2] = Math.round(Math.min(255, Math.max(0, bufA[i + 2] * invAlpha)));
        pixels[i + 3] = Math.round(Math.min(255, Math.max(0, a)));
      } else {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = 0;
      }
    }

    workCtx.putImageData(imgData, 0, 0);
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return null;

  const dx = Math.round((sx0 - sourceRect.x) / scaleRatioX);
  const dy = Math.round((sy0 - sourceRect.y) / scaleRatioY);
  outCtx.drawImage(workCanvas, dx, dy);
  return outCanvas;
}

/**
 * Deterministic blur implementation that samples an expanded region from sourceCanvas,
 * applies separable premultiplied Gaussian blur, and draws the blurred patch cleanly
 * into the target context without edge-bleed halos.
 */
export function renderBlur(
  ctx: CanvasRenderingContext2D,
  obj: BlurObject,
  sourceCanvas: HTMLCanvasElement
) {
  const { x, y, width, height, blurRadius, rotation } = obj;
  if (width <= 0 || height <= 0 || sourceCanvas.width <= 0 || sourceCanvas.height <= 0) return;
  if (
    x >= sourceCanvas.width ||
    y >= sourceCanvas.height ||
    x + width <= 0 ||
    y + height <= 0
  ) {
    return;
  }

  const blurred = createBlurredCanvas(
    sourceCanvas,
    { x, y, width, height },
    width,
    height,
    blurRadius
  );
  if (!blurred) return;

  ctx.save();
  try {
    if (rotation !== 0) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }
    ctx.drawImage(blurred, x, y, width, height);
  } finally {
    ctx.restore();
  }
}
