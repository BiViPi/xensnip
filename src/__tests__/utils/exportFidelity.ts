/**
 * exportFidelity.ts
 *
 * Fidelity comparison helper and deterministic test image generator
 * for the Workstream 2 export matrix.
 *
 * API:
 *   createTestImage(w, h) -> byte-stable 800x600 gradient+grid PNG
 *   assertExportFidelity(bytes, case) -> FidelityResult with pass/fail
 *
 * When UPDATE_BASELINES=1 is set, assertExportFidelity writes the actual
 * bytes as the new baseline and returns pass: true.
 */

import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import '../setup/konva-headless';

// Types

export interface FidelityTolerance {
  /** Maximum percentage of differing pixels across the entire image (0-100). */
  totalDiffPercent: number;
  /** Maximum pixels allowed to differ outside the annotation's objectBounds. */
  outsideObjectMaxPixels?: number;
}

export interface FidelityCase {
  /** Relative path under __fixtures__/export-fidelity/, e.g. "arrow/v1-f1.png". */
  baselineName: string;
  /** Bounding box of the annotation on the canvas (used for outsideObject check). */
  objectBounds?: { x: number; y: number; w: number; h: number };
  tolerance: FidelityTolerance;
  format: 'png' | 'jpeg';
}

export interface FidelityResult {
  pass: boolean;
  totalDiffPercent: number;
  outsideObjectDiffPixels: number;
  /** Absolute path of the written diff image, present on failure. */
  diffPath?: string;
}

// Paths

const FIXTURES_DIR = path.resolve(
  __dirname,
  '../__fixtures__/export-fidelity'
);

// Deterministic test image

/**
 * Creates an 800x600 gradient + grid image. The gradient and grid are
 * computed deterministically so two consecutive calls produce byte-identical
 * PNG buffers.
 */
export function createTestImageBuffer(w = 800, h = 600): Buffer {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Gradient background: top-left blue -> bottom-right teal
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#1e3a5f');
  grad.addColorStop(0.5, '#2d6a8a');
  grad.addColorStop(1, '#1a9e8f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Grid lines every 50px for visual texture
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  return canvas.toBuffer('image/png');
}

/**
 * Returns an HTMLImageElement-like object backed by node-canvas so it can
 * be passed to composeWithAnnotations.
 *
 * composeWithAnnotations accepts `HTMLImageElement` but really only needs
 * `.width`, `.height`, and to be drawable via `ctx.drawImage`.
 * node-canvas's loadImage returns an object that satisfies both.
 */
export async function createTestImageElement(w = 800, h = 600): Promise<HTMLImageElement> {
  const { loadImage } = await import('canvas');
  const buffer = createTestImageBuffer(w, h);
  const img = await loadImage(buffer);
  return img as unknown as HTMLImageElement;
}

// PNG decode helper

function decodePng(buffer: Buffer): { data: Buffer; width: number; height: number } {
  const png = PNG.sync.read(buffer);
  return { data: png.data, width: png.width, height: png.height };
}

/**
 * Decode a JPEG or PNG Uint8Array to raw RGBA via node-canvas.
 * We redraw to a canvas to get a consistent RGBA buffer.
 */
async function decodeToRgba(
  bytes: Uint8Array,
  mimeType: 'png' | 'jpeg'
): Promise<{ data: Buffer; width: number; height: number }> {
  if (mimeType === 'png') {
    return decodePng(Buffer.from(bytes));
  }

  const { loadImage } = await import('canvas');
  const img = await loadImage(Buffer.from(bytes));
  const c = createCanvas(img.width, img.height);
  const cx = c.getContext('2d');
  cx.drawImage(img as unknown as Parameters<typeof cx.drawImage>[0], 0, 0);
  const imageData = cx.getImageData(0, 0, img.width, img.height);
  return { data: Buffer.from(imageData.data.buffer), width: img.width, height: img.height };
}

// Core fidelity assertion

export async function assertExportFidelity(
  actualBytes: Uint8Array,
  fidelityCase: FidelityCase
): Promise<FidelityResult> {
  const baselinePath = path.join(FIXTURES_DIR, fidelityCase.baselineName);
  const baselineDir = path.dirname(baselinePath);
  const diffPath = path.join(
    FIXTURES_DIR,
    fidelityCase.baselineName.replace(/\.png$/, '.diff.png')
  );

  // UPDATE_BASELINES mode: write and return pass.
  // Baselines are always stored as PNG, even for JPEG rows.
  if (process.env.UPDATE_BASELINES === '1') {
    fs.mkdirSync(baselineDir, { recursive: true });
    let baselineBuffer: Buffer;
    if (fidelityCase.format === 'jpeg') {
      const decoded = await decodeToRgba(actualBytes, 'jpeg');
      const png = new PNG({ width: decoded.width, height: decoded.height });
      png.data = decoded.data;
      baselineBuffer = PNG.sync.write(png);
    } else {
      baselineBuffer = Buffer.from(actualBytes);
    }
    fs.writeFileSync(baselinePath, baselineBuffer);
    if (fs.existsSync(diffPath)) {
      fs.rmSync(diffPath);
    }
    return { pass: true, totalDiffPercent: 0, outsideObjectDiffPixels: 0 };
  }

  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `Baseline not found: ${baselinePath}\n` +
        'Run with UPDATE_BASELINES=1 to generate baselines.'
    );
  }

  const baselineBuffer = fs.readFileSync(baselinePath);
  const [actual, baseline] = await Promise.all([
    decodeToRgba(actualBytes, fidelityCase.format),
    decodePng(baselineBuffer),
  ]);

  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    return {
      pass: false,
      totalDiffPercent: 100,
      outsideObjectDiffPixels: 0,
      diffPath: undefined,
    };
  }

  const { width, height } = baseline;
  const totalPixels = width * height;
  const diffData = Buffer.alloc(totalPixels * 4, 0);

  const pixelDiff = pixelmatch(
    actual.data,
    baseline.data,
    diffData,
    width,
    height,
    { threshold: 0.1, includeAA: true, diffMask: true }
  );

  const totalDiffPercent = (pixelDiff / totalPixels) * 100;

  // Outside-object pixel check is only meaningful when there are actual diffs.
  let outsideObjectDiffPixels = 0;
  if (pixelDiff > 0 && fidelityCase.objectBounds) {
    const { x: ox, y: oy, w: ow, h: oh } = fidelityCase.objectBounds;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const inBounds = px >= ox && px < ox + ow && py >= oy && py < oy + oh;
        if (!inBounds) {
          const idx = (py * width + px) * 4;
          // With diffMask enabled, only true diff pixels keep a visible alpha channel.
          if (diffData[idx + 3] > 128) {
            outsideObjectDiffPixels++;
          }
        }
      }
    }
  }

  const pass =
    totalDiffPercent <= fidelityCase.tolerance.totalDiffPercent &&
    (fidelityCase.tolerance.outsideObjectMaxPixels === undefined ||
      outsideObjectDiffPixels <= fidelityCase.tolerance.outsideObjectMaxPixels);

  let writtenDiffPath: string | undefined;
  if (!pass) {
    fs.mkdirSync(path.dirname(diffPath), { recursive: true });
    const diffPng = new PNG({ width, height });
    diffPng.data = diffData;
    const diffBuffer = PNG.sync.write(diffPng);
    fs.writeFileSync(diffPath, diffBuffer);
    writtenDiffPath = diffPath;
  } else if (fs.existsSync(diffPath)) {
    fs.rmSync(diffPath);
  }

  return { pass, totalDiffPercent, outsideObjectDiffPixels, diffPath: writtenDiffPath };
}
