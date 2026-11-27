import { describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from 'canvas';
import { PNG } from 'pngjs';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { getRulerLabelLayout } from '../../annotate/renderers/pixelRulerLayout';
import { renderPixelRuler } from '../../annotate/renderers/PixelRulerRenderer';
import { V1_PLAIN, V4_FULL_PRESET } from '../utils/testPresets';
import type { PixelRulerObject } from '../../annotate/state/types';

function decodePng(bytes: Uint8Array): PNG {
  return PNG.sync.read(Buffer.from(bytes));
}

function getPixel(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (y * png.width + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

async function createSolidImage(w = 400, h = 240, fill = '#f8fafc'): Promise<HTMLImageElement> {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  const img = await loadImage(c.toBuffer('image/png'));
  return img as unknown as HTMLImageElement;
}

describe('export fidelity — pixel_ruler (T031)', () => {
  it('normalizes right-to-left & diagonal angles upright and expands pill width for 4-digit "1280px"', () => {
    const rtlLayout = getRulerLabelLayout([0, 0, -1280, 0], 46, 1);
    expect(rtlLayout.label).toBe('1280px');
    expect(rtlLayout.displayAngleDeg).toBe(0);
    expect(rtlLayout.pillWidth).toBeGreaterThanOrEqual(56);

    const diagLayout = getRulerLabelLayout([0, 0, -300, -300], 38, 1);
    expect(diagLayout.displayAngleDeg).toBeGreaterThanOrEqual(-90);
    expect(diagLayout.displayAngleDeg).toBeLessThanOrEqual(90);
    expect(diagLayout.displayAngleDeg).toBeCloseTo(45, 4);
  });

  it('exports right-to-left PixelRuler upright cleanly on V1_PLAIN and V4_FULL_PRESET with roundRect fallback', async () => {
    const img = await createSolidImage(400, 240, '#f8fafc');
    const rtlRuler: PixelRulerObject = {
      id: 'ruler-rtl',
      type: 'pixel_ruler',
      x: 340,
      y: 120,
      rotation: 0,
      points: [0, 0, -260, 0],
      stroke: '#ef4444',
      strokeWidth: 2,
      labelFill: '#ffffff',
      showBackground: true,
      draggable: false,
    };

    const plainPng = decodePng(
      await composeWithAnnotations(img, V1_PLAIN, [rtlRuler], 'image/png', 1.0)
    );
    // Ruler midpoint is (210, 120); 78% translucent #0f172a pill over #f8fafc sits at ~y=96..116
    const [pr, pg, pb] = getPixel(plainPng, 190, 100);
    expect(pr).toBeLessThan(90);
    expect(pg).toBeLessThan(95);
    expect(pb).toBeLessThan(110);

    // Below the line (~y=134) remains bright #f8fafc background
    const [br, bg, bb] = getPixel(plainPng, 190, 134);
    expect(br).toBeGreaterThan(230);
    expect(bg).toBeGreaterThan(230);
    expect(bb).toBeGreaterThan(230);

    const fullPng = decodePng(
      await composeWithAnnotations(img, V4_FULL_PRESET, [rtlRuler], 'image/png', 1.0)
    );
    expect(fullPng.width).toBeGreaterThan(400);

    // Fallback test when ctx.roundRect is undefined
    const fallbackCanvas = createCanvas(400, 200);
    const fCtx = fallbackCanvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    Object.defineProperty(fCtx, 'roundRect', { value: undefined, configurable: true });
    expect(() => renderPixelRuler(fCtx, { ...rtlRuler, points: [0, 0, -1280, 0] })).not.toThrow();
  });
});
