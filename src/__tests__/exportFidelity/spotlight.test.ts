import { describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from 'canvas';
import { PNG } from 'pngjs';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { renderSpotlightMaskCanvas } from '../../annotate/renderers/SpotlightRenderer';
import { V1_PLAIN } from '../utils/testPresets';
import type { ArrowObject, RectangleObject, SpotlightObject } from '../../annotate/state/types';

function decodePng(bytes: Uint8Array): PNG {
  return PNG.sync.read(Buffer.from(bytes));
}

function getPixel(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (y * png.width + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

async function createSolidImage(w: number, h: number, fill: string): Promise<HTMLImageElement> {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  const img = await loadImage(c.toBuffer('image/png'));
  return img as unknown as HTMLImageElement;
}

describe('Spotlight — non-destructive multi-cutout & export cleanliness (T014)', () => {
  it('illuminates multiple Spotlight cutouts simultaneously on one shared dim backdrop', async () => {
    const img = await createSolidImage(400, 300, '#c8c8c8');
    const sp1: SpotlightObject = {
      id: 'sp-1',
      type: 'spotlight',
      x: 40,
      y: 40,
      rotation: 0,
      width: 100,
      height: 80,
      opacity: 0.6,
      cornerRadius: 16,
      draggable: true,
    };
    const sp2: SpotlightObject = {
      id: 'sp-2',
      type: 'spotlight',
      x: 220,
      y: 150,
      rotation: 0,
      width: 120,
      height: 90,
      opacity: 0.6,
      cornerRadius: 16,
      draggable: true,
    };

    const [baseBytes, exportBytes] = await Promise.all([
      composeWithAnnotations(img, V1_PLAIN, [], 'image/png', 1.0),
      composeWithAnnotations(img, V1_PLAIN, [sp1, sp2], 'image/png', 1.0),
    ]);

    const basePng = decodePng(baseBytes);
    const outPng = decodePng(exportBytes);

    // Interior of both cutouts matches base bright gray (#c8c8c8) within rounding
    const [r1, g1, b1] = getPixel(outPng, 90, 80);
    const [r2, g2, b2] = getPixel(outPng, 280, 195);
    expect(Math.abs(r1 - 200)).toBeLessThanOrEqual(2);
    expect(Math.abs(g1 - 200)).toBeLessThanOrEqual(2);
    expect(Math.abs(b1 - 200)).toBeLessThanOrEqual(2);
    expect(Math.abs(r2 - 200)).toBeLessThanOrEqual(2);
    expect(Math.abs(g2 - 200)).toBeLessThanOrEqual(2);
    expect(Math.abs(b2 - 200)).toBeLessThanOrEqual(2);

    // Outer pixel is dimmed once (~0.4 * 200 = 80), NOT double-darkened
    const [br] = getPixel(basePng, 10, 10);
    const [or] = getPixel(outPng, 10, 10);
    expect(or).toBeLessThan(br * 0.55);
    expect(or).toBeGreaterThan(br * 0.25);
  });

  it('preserves earlier Arrow and Rectangle annotations underneath multiple Spotlights', async () => {
    const img = await createSolidImage(400, 300, '#e2e8f0');
    const arrow: ArrowObject = {
      id: 'arr-under',
      type: 'arrow',
      x: 30,
      y: 80,
      rotation: 0,
      points: [0, 0, 140, 0],
      stroke: '#ff0000',
      strokeWidth: 10,
      pointerLength: 14,
      pointerWidth: 14,
      style: 'solid',
      draggable: false,
    };
    const rectAfter: RectangleObject = {
      id: 'rect-after',
      type: 'rectangle',
      x: 240,
      y: 40,
      rotation: 0,
      width: 90,
      height: 50,
      stroke: '#00ff00',
      strokeWidth: 8,
      lineStyle: 'solid',
      cornerRadius: 0,
      draggable: false,
    };
    const sp1: SpotlightObject = {
      id: 'sp-1',
      type: 'spotlight',
      x: 60,
      y: 40,
      rotation: 0,
      width: 100,
      height: 80,
      opacity: 0.65,
      cornerRadius: 12,
      draggable: true,
    };
    const sp2: SpotlightObject = {
      id: 'sp-2',
      type: 'spotlight',
      x: 220,
      y: 160,
      rotation: 0,
      width: 100,
      height: 80,
      opacity: 0.65,
      cornerRadius: 12,
      draggable: true,
    };

    const bytes = await composeWithAnnotations(
      img,
      V1_PLAIN,
      [arrow, sp1, sp2, rectAfter],
      'image/png',
      1.0
    );
    const png = decodePng(bytes);

    // Arrow segment inside sp1 cutout (110, 80) stays bright red #ff0000 (not erased by destination-out)
    const [ar, ag, ab] = getPixel(png, 110, 80);
    expect(ar).toBeGreaterThan(210);
    expect(ag).toBeLessThan(50);
    expect(ab).toBeLessThan(50);

    // Arrow segment outside cutouts (40, 80) stays preserved underneath dim backdrop
    const [dar, dag, dab] = getPixel(png, 40, 80);
    expect(dar).toBeGreaterThan(dag + 40);
    expect(dar).toBeGreaterThan(dab + 40);

    // Green rectangle after last spotlight renders crisp bright green above backdrop
    const [rr, rg, rb] = getPixel(png, 285, 40);
    expect(rg).toBeGreaterThan(210);
    expect(rr).toBeLessThan(50);
    expect(rb).toBeLessThan(50);
  });

  it('omits editor selection indigo/cyan border glow from exported PNGs and builds isolated mask canvas', async () => {
    const img = await createSolidImage(320, 240, '#404040');
    const sp: SpotlightObject = {
      id: 'sp-clean',
      type: 'spotlight',
      x: 80,
      y: 60,
      rotation: 0,
      width: 140,
      height: 100,
      opacity: 0.6,
      cornerRadius: 20,
      draggable: true,
    };

    const bytes = await composeWithAnnotations(img, V1_PLAIN, [sp], 'image/png', 1.0);
    const png = decodePng(bytes);

    let blueTintedSelectionPixels = 0;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const [r, , b] = getPixel(png, x, y);
        if (b - r > 20) {
          blueTintedSelectionPixels++;
        }
      }
    }
    expect(blueTintedSelectionPixels).toBe(0);

    const mask = renderSpotlightMaskCanvas([sp], 320, 240);
    expect(mask).not.toBeNull();
    expect(mask!.width).toBe(320);
    expect(mask!.height).toBe(240);
  });
});
