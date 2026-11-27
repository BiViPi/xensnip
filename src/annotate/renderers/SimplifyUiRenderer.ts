import { SimplifyUiObject } from '../state/types';
import { createBlurredCanvas } from './BlurRenderer';

export interface SimplifyUiSampleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SimplifyUiRenderOptions {
  detailLevel?: number;
  blockOpacity?: number;
  dimOpacity?: number;
  blurRadius?: number;
  cornerRadius?: number;
}

interface DetectedSpan {
  x: number;
  y: number;
  width: number;
  height: number;
  meanR: number;
  meanG: number;
  meanB: number;
  density: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Universal rounded-rectangle path helper compatible with both browser and headless node-canvas contexts.
 */
export function addSimplifyRoundedRectPath(
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

function estimateModalBackgroundColor(
  pixels: Uint8ClampedArray,
  w: number,
  h: number
): [number, number, number] {
  const bins = new Map<number, { weight: number; rSum: number; gSum: number; bSum: number }>();

  const addSample = (idx: number, weight: number) => {
    if (pixels[idx + 3] < 20) return;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const existing = bins.get(key);
    if (existing) {
      existing.weight += weight;
      existing.rSum += r * weight;
      existing.gSum += g * weight;
      existing.bSum += b * weight;
    } else {
      bins.set(key, { weight, rSum: r * weight, gSum: g * weight, bSum: b * weight });
    }
  };

  for (let x = 0; x < w; x++) {
    addSample((0 * w + x) * 4, 2);
    if (h > 1) addSample(((h - 1) * w + x) * 4, 2);
    if (h > 3) {
      addSample((1 * w + x) * 4, 2);
      addSample(((h - 2) * w + x) * 4, 2);
    }
  }
  for (let y = 2; y < h - 2; y++) {
    addSample((y * w + 0) * 4, 2);
    if (w > 1) addSample((y * w + w - 1) * 4, 2);
    if (w > 3) {
      addSample((y * w + 1) * 4, 2);
      addSample((y * w + w - 2) * 4, 2);
    }
  }

  const stride = Math.max(2, Math.floor(Math.sqrt(w * h) / 28));
  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      addSample((y * w + x) * 4, 1);
    }
  }

  let best: { weight: number; rSum: number; gSum: number; bSum: number } | null = null;
  for (const entry of bins.values()) {
    if (!best || entry.weight > best.weight) {
      best = entry;
    }
  }

  if (!best || best.weight <= 0) return [30, 41, 59];
  return [
    Math.round(best.rSum / best.weight),
    Math.round(best.gSum / best.weight),
    Math.round(best.bSum / best.weight),
  ];
}

function segmentForegroundSpans(
  fg: Uint8Array,
  projectionMask: Uint8Array,
  pixels: Uint8ClampedArray,
  w: number,
  rx0: number,
  ry0: number,
  rx1: number,
  ry1: number,
  mergeGapX: number,
  mergeGapY: number
): DetectedSpan[] {
  const spans: DetectedSpan[] = [];
  const subW = rx1 - rx0 + 1;
  const subH = ry1 - ry0 + 1;
  if (subW < 3 || subH < 3) return spans;

  const minPixelsInRow = Math.max(1, Math.min(2, subW));
  const rowActive = new Uint8Array(subH);
  for (let y = ry0; y <= ry1; y++) {
    let count = 0;
    const rowOff = y * w;
    for (let x = rx0; x <= rx1; x++) {
      if (projectionMask[rowOff + x]) count++;
    }
    if (count >= minPixelsInRow) {
      rowActive[y - ry0] = 1;
    }
  }

  // Group vertically adjacent active rows bridging `mergeGapY`
  const bands: Array<[number, number]> = [];
  let bandStart = -1;
  let zeroRun = 0;
  for (let dy = 0; dy < subH; dy++) {
    if (rowActive[dy]) {
      if (bandStart < 0) bandStart = ry0 + dy;
      zeroRun = 0;
    } else if (bandStart >= 0) {
      zeroRun++;
      if (zeroRun > mergeGapY) {
        const bandEnd = ry0 + dy - zeroRun;
        if (bandEnd - bandStart + 1 >= 3) {
          bands.push([bandStart, bandEnd]);
        }
        bandStart = -1;
        zeroRun = 0;
      }
    }
  }
  if (bandStart >= 0) {
    const bandEnd = ry0 + subH - 1 - zeroRun;
    if (bandEnd - bandStart + 1 >= 3) {
      bands.push([bandStart, bandEnd]);
    }
  }

  for (const [by0, by1] of bands) {
    const colCounts = new Int32Array(subW);
    for (let y = by0; y <= by1; y++) {
      const rowOff = y * w;
      for (let x = rx0; x <= rx1; x++) {
        if (projectionMask[rowOff + x]) colCounts[x - rx0]++;
      }
    }

    const horizRanges: Array<[number, number]> = [];
    let spanStart = -1;
    let colZeroRun = 0;
    for (let dx = 0; dx < subW; dx++) {
      if (colCounts[dx] > 0) {
        if (spanStart < 0) spanStart = rx0 + dx;
        colZeroRun = 0;
      } else if (spanStart >= 0) {
        colZeroRun++;
        if (colZeroRun > mergeGapX) {
          const spanEnd = rx0 + dx - colZeroRun;
          horizRanges.push([spanStart, spanEnd]);
          spanStart = -1;
          colZeroRun = 0;
        }
      }
    }
    if (spanStart >= 0) {
      const spanEnd = rx0 + subW - 1 - colZeroRun;
      horizRanges.push([spanStart, spanEnd]);
    }

    for (const [cx0, cx1] of horizRanges) {
      const cw = cx1 - cx0 + 1;
      if (cw < 3) continue;

      let cy0 = by1;
      let cy1 = by0;
      let fgCount = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;

      for (let y = by0; y <= by1; y++) {
        const rowOff = y * w;
        for (let x = cx0; x <= cx1; x++) {
          const idxMask = rowOff + x;
          if (projectionMask[idxMask] || fg[idxMask]) {
            if (y < cy0) cy0 = y;
            if (y > cy1) cy1 = y;
          }
          if (fg[idxMask]) {
            fgCount++;
            const idx = idxMask * 4;
            rSum += pixels[idx];
            gSum += pixels[idx + 1];
            bSum += pixels[idx + 2];
          }
        }
      }

      const ch = cy1 - cy0 + 1;
      if (ch < 3 || fgCount < 4) continue;

      spans.push({
        x: cx0,
        y: cy0,
        width: cw,
        height: ch,
        meanR: Math.round(rSum / fgCount),
        meanG: Math.round(gSum / fgCount),
        meanB: Math.round(bSum / fgCount),
        density: fgCount / (cw * ch),
      });
    }
  }

  return spans;
}

function drawSkeletonPill(
  ctx: CanvasRenderingContext2D,
  span: DetectedSpan,
  bgLum: number,
  contrastAlpha: number,
  maxBarH: number,
  heightRatio: number
) {
  const { x, y, width, height, meanR, meanG, meanB } = span;
  const meanLum = (0.2126 * meanR + 0.7152 * meanG + 0.0722 * meanB) / 255;

  // Blend extracted UI color toward a neutral wireframe pill color that clearly contrasts with the surface
  const neutral = bgLum < 0.5 ? [226, 232, 240] : [30, 41, 59];
  const lumDelta = Math.abs(meanLum - bgLum);
  const neutralWeight = lumDelta < 0.14 ? 0.72 : 0.35;
  const pillR = Math.round(meanR * (1 - neutralWeight) + neutral[0] * neutralWeight);
  const pillG = Math.round(meanG * (1 - neutralWeight) + neutral[1] * neutralWeight);
  const pillB = Math.round(meanB * (1 - neutralWeight) + neutral[2] * neutralWeight);

  ctx.save();
  ctx.fillStyle = `rgb(${pillR}, ${pillG}, ${pillB})`;
  ctx.globalAlpha = contrastAlpha;

  const isCompactIcon =
    width <= height * 1.45 && width >= 8 && height >= 8 && height <= 48;

  ctx.beginPath();
  if (isCompactIcon) {
    const rx = height >= 18 ? Math.round(Math.min(width, height) * 0.3) : 4;
    addSimplifyRoundedRectPath(ctx, x, y, width, height, rx);
  } else {
    const barH = Math.max(5, Math.min(maxBarH, Math.round(height * heightRatio)));
    const barY = y + Math.round((height - barH) / 2);
    const pillRx = Math.min(Math.floor(barH / 2), 10);
    addSimplifyRoundedRectPath(ctx, x, barY, width, barH, pillRx);
  }
  ctx.fill();
  ctx.restore();
}

/**
 * Seamlessly erases UI text, icons, and dense controls inside `sourceRect` and replaces them with
 * clean wireframe skeleton pills matching the local page surface without adding box borders.
 */
export function createSimplifyUiCanvas(
  sourceCanvas: HTMLCanvasElement,
  sourceRect: SimplifyUiSampleRect,
  outWidth: number,
  outHeight: number,
  options: SimplifyUiRenderOptions = {}
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

  const ix0 = Math.max(0, sourceRect.x);
  const iy0 = Math.max(0, sourceRect.y);
  const ix1 = Math.min(sourceCanvas.width, sourceRect.x + sourceRect.width);
  const iy1 = Math.min(sourceCanvas.height, sourceRect.y + sourceRect.height);

  if (ix1 <= ix0 || iy1 <= iy0) {
    return null;
  }

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const workCtx = workCanvas.getContext('2d');
  if (!workCtx) return null;

  const scaleRatioX = sourceRect.width / w;
  const scaleRatioY = sourceRect.height / h;
  const destX = (ix0 - sourceRect.x) / scaleRatioX;
  const destY = (iy0 - sourceRect.y) / scaleRatioY;
  const destW = (ix1 - ix0) / scaleRatioX;
  const destH = (iy1 - iy0) / scaleRatioY;

  workCtx.fillStyle = '#0f172a';
  workCtx.fillRect(0, 0, w, h);
  workCtx.drawImage(sourceCanvas, ix0, iy0, ix1 - ix0, iy1 - iy0, destX, destY, destW, destH);

  const imgData = workCtx.getImageData(0, 0, w, h);
  const pixels = imgData.data;

  const [bgR, bgG, bgB] = estimateModalBackgroundColor(pixels, w, h);
  const bgLum = (0.2126 * bgR + 0.7152 * bgG + 0.0722 * bgB) / 255;

  const detail = clamp(options.detailLevel ?? 50, 0, 100);
  const normDetail = detail / 100;
  const threshold = Math.round(42 - normDetail * 24);
  const coreThreshold = Math.max(36, threshold + 12);
  const contrastAlpha = clamp(options.blockOpacity ?? options.dimOpacity ?? 0.52, 0.15, 0.9);
  const blurRadius = clamp(options.blurRadius ?? 4, 0, 16);
  const clampedRadius = Math.max(0, Math.min(options.cornerRadius ?? 16, w / 2, h / 2));

  // Map Detail 0..100 cleanly across 3 perceptual scales:
  // - 0..25: Macro paragraph blocks (merges adjacent text lines & gaps)
  // - 25..65: Clean line/phrase bars (default 50)
  // - 65..100: Fine word-by-word wireframe pills
  let mergeGapX: number;
  let mergeGapY: number;
  let maxBarH: number;
  let heightRatio: number;

  if (detail <= 25) {
    const t = detail / 25;
    mergeGapY = Math.round(16 - t * 12);
    mergeGapX = Math.round(36 - t * 14);
    maxBarH = Math.round(72 - t * 46);
    heightRatio = 0.84;
  } else if (detail <= 65) {
    const t = (detail - 25) / 40;
    mergeGapY = detail < 40 ? 2 : 1;
    mergeGapX = Math.round(22 - t * 16);
    maxBarH = 22;
    heightRatio = 0.76;
  } else {
    const t = (detail - 65) / 35;
    mergeGapY = 0;
    mergeGapX = Math.round(5 - t * 4);
    maxBarH = 20;
    heightRatio = 0.72;
  }

  const totalPx = w * h;
  const fg = new Uint8Array(totalPx);
  const coreFg = new Uint8Array(totalPx);
  const rawDirty = new Uint8Array(totalPx);
  const rowBgR = new Int32Array(h);
  const rowBgG = new Int32Array(h);
  const rowBgB = new Int32Array(h);
  const rowBgCount = new Int32Array(h);

  let cleanDiffSum = 0;
  let cleanCount = 0;

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      const idx = (rowOff + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const dr = Math.abs(r - bgR);
      const dg = Math.abs(g - bgG);
      const db = Math.abs(b - bgB);
      const maxCh = Math.max(dr, dg, db);
      const dist = Math.hypot(dr, dg, db);

      if (maxCh > threshold || dist > threshold * 1.3) {
        fg[rowOff + x] = 1;
      }
      if (maxCh > coreThreshold || dist > coreThreshold * 1.3) {
        coreFg[rowOff + x] = 1;
      }
      if (maxCh > 10) {
        rawDirty[rowOff + x] = 1;
      } else {
        rowBgR[y] += r;
        rowBgG[y] += g;
        rowBgB[y] += b;
        rowBgCount[y]++;
        cleanDiffSum += maxCh;
        cleanCount++;
      }
    }
  }

  // Dilate dirty mask by 3px horizontally / 2px vertically to completely scrub subpixel text AA halos
  const eraseMask = new Uint8Array(totalPx);
  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      if (!rawDirty[rowOff + x]) continue;
      const ny0 = Math.max(0, y - 2);
      const ny1 = Math.min(h - 1, y + 2);
      const nx0 = Math.max(0, x - 3);
      const nx1 = Math.min(w - 1, x + 3);
      for (let ny = ny0; ny <= ny1; ny++) {
        const nOff = ny * w;
        for (let nx = nx0; nx <= nx1; nx++) {
          eraseMask[nOff + nx] = 1;
        }
      }
    }
  }

  // Build seamless cleaned surface keeping pure background pixels intact
  const surfaceCanvas = document.createElement('canvas');
  surfaceCanvas.width = w;
  surfaceCanvas.height = h;
  const surfaceCtx = surfaceCanvas.getContext('2d');
  if (!surfaceCtx) return null;

  const surfaceData = surfaceCtx.createImageData(w, h);
  const sPixels = surfaceData.data;
  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    const cnt = rowBgCount[y];
    const cleanR = cnt > 0 ? Math.round(rowBgR[y] / cnt) : bgR;
    const cleanG = cnt > 0 ? Math.round(rowBgG[y] / cnt) : bgG;
    const cleanB = cnt > 0 ? Math.round(rowBgB[y] / cnt) : bgB;

    for (let x = 0; x < w; x++) {
      const idx = (rowOff + x) * 4;
      if (eraseMask[rowOff + x]) {
        sPixels[idx] = cleanR;
        sPixels[idx + 1] = cleanG;
        sPixels[idx + 2] = cleanB;
        sPixels[idx + 3] = 255;
      } else {
        sPixels[idx] = pixels[idx];
        sPixels[idx + 1] = pixels[idx + 1];
        sPixels[idx + 2] = pixels[idx + 2];
        sPixels[idx + 3] = 255;
      }
    }
  }
  surfaceCtx.putImageData(surfaceData, 0, 0);

  const avgBgDiff = cleanCount > 0 ? cleanDiffSum / cleanCount : 0;
  const smoothedSurface =
    blurRadius > 0 && avgBgDiff > 6
      ? createBlurredCanvas(surfaceCanvas, { x: 0, y: 0, width: w, height: h }, w, h, Math.min(8, blurRadius)) ?? surfaceCanvas
      : surfaceCanvas;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return null;

  outCtx.save();
  outCtx.beginPath();
  addSimplifyRoundedRectPath(outCtx, 0, 0, w, h, clampedRadius);
  outCtx.clip();

  outCtx.drawImage(smoothedSurface, 0, 0, w, h);

  const projectionMask = detail >= 65 ? coreFg : fg;
  const topSpans = segmentForegroundSpans(
    fg,
    projectionMask,
    pixels,
    w,
    0,
    0,
    w - 1,
    h - 1,
    mergeGapX,
    mergeGapY
  );

  for (const span of topSpans) {
    if (span.width > 44 && span.height > 26 && span.density < 0.18 && detail > 25) {
      const innerSpans = segmentForegroundSpans(
        fg,
        projectionMask,
        pixels,
        w,
        span.x + 3,
        span.y + 3,
        span.x + span.width - 4,
        span.y + span.height - 4,
        mergeGapX,
        mergeGapY
      );
      if (innerSpans.length > 0) {
        for (const inner of innerSpans) {
          drawSkeletonPill(outCtx, inner, bgLum, contrastAlpha, maxBarH, heightRatio);
        }
      } else {
        drawSkeletonPill(outCtx, span, bgLum, contrastAlpha, maxBarH, heightRatio);
      }
    } else {
      drawSkeletonPill(outCtx, span, bgLum, contrastAlpha, maxBarH, heightRatio);
    }
  }

  outCtx.restore();

  return outCanvas;
}

export function renderSimplifyUi(
  ctx: CanvasRenderingContext2D,
  obj: SimplifyUiObject,
  sourceCanvas: HTMLCanvasElement
) {
  const { x, y, width, height, rotation } = obj;
  if (width <= 0 || height <= 0 || sourceCanvas.width <= 0 || sourceCanvas.height <= 0) return;

  const simplified = createSimplifyUiCanvas(
    sourceCanvas,
    { x, y, width, height },
    width,
    height,
    {
      detailLevel: obj.detailLevel,
      blockOpacity: obj.blockOpacity,
      dimOpacity: obj.dimOpacity,
      blurRadius: obj.blurRadius,
      cornerRadius: obj.cornerRadius,
    }
  );
  if (!simplified) return;

  ctx.save();
  try {
    if (rotation !== 0) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }
    ctx.drawImage(simplified, x, y, width, height);
  } finally {
    ctx.restore();
  }
}
