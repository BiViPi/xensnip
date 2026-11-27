import { describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from 'canvas';
import { PNG } from 'pngjs';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { V1_PLAIN, V4_FULL_PRESET } from '../utils/testPresets';
import type { CalloutObject } from '../../annotate/state/types';

function decodePng(bytes: Uint8Array): PNG {
  return PNG.sync.read(Buffer.from(bytes));
}

function getPixel(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (y * png.width + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

async function createSolidCanvasImage(w = 400, h = 300, fill = '#0f172a'): Promise<HTMLImageElement> {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  const img = await loadImage(c.toBuffer('image/png'));
  return img as unknown as HTMLImageElement;
}

describe('export fidelity — callout (T023)', () => {
  const CALLOUT_BASE: CalloutObject = {
    id: 'cal-1',
    type: 'callout',
    x: 180,
    y: 120,
    rotation: 0,
    width: 120,
    height: 48,
    text: 'Click Here',
    fontSize: 14,
    fontFamily: 'sans-serif',
    fill: '#ffffff',
    textColor: '#1e293b',
    stroke: '#1e293b',
    padding: 8,
    cornerRadius: 6,
    targetX: 70,
    targetY: 80,
    lineColor: '#ef4444',
    lineWidth: 3,
    draggable: true,
  };

  it('renders Callout dot, leader line, and label cleanly on V1_PLAIN and V4_FULL_PRESET', async () => {
    const img = await createSolidCanvasImage(400, 300, '#0f172a');

    const plainPng = decodePng(
      await composeWithAnnotations(img, V1_PLAIN, [CALLOUT_BASE], 'image/png', 1.0)
    );
    // Red target dot (#ef4444) at (70, 80)
    const [dr, dg, db] = getPixel(plainPng, 70, 80);
    expect(dr).toBeGreaterThan(200);
    expect(dg).toBeLessThan(85);
    expect(db).toBeLessThan(85);

    // White label box interior away from centered text (near top-left corner x=186, y=126)
    const [br, bg, bb] = getPixel(plainPng, 186, 126);
    expect(br).toBeGreaterThan(240);
    expect(bg).toBeGreaterThan(240);
    expect(bb).toBeGreaterThan(240);

    // Works cleanly with padded + HiDPI/V4_FULL_PRESET
    const fullBytes = await composeWithAnnotations(img, V4_FULL_PRESET, [CALLOUT_BASE], 'image/png', 1.0);
    expect(decodePng(fullBytes).width).toBeGreaterThan(400);
  });

  it('keeps target dot pinned at (targetX, targetY) when Callout label box (x, y) is moved', async () => {
    const img = await createSolidCanvasImage(400, 300, '#0f172a');

    const movedCallout: CalloutObject = {
      ...CALLOUT_BASE,
      x: 240,
      y: 210,
      // targetX & targetY stay pinned at (70, 80)!
    };

    const movedPng = decodePng(
      await composeWithAnnotations(img, V1_PLAIN, [movedCallout], 'image/png', 1.0)
    );

    // Pinned dot (#ef4444) remains at exact (70, 80)
    const [dr, dg, db] = getPixel(movedPng, 70, 80);
    expect(dr).toBeGreaterThan(200);
    expect(dg).toBeLessThan(85);
    expect(db).toBeLessThan(85);

    // Box moved to (240, 210)
    const [br, bg, bb] = getPixel(movedPng, 246, 216);
    expect(br).toBeGreaterThan(240);
    expect(bg).toBeGreaterThan(240);
    expect(bb).toBeGreaterThan(240);

    // Old box interior (210, 126) is back to background (#0f172a)
    const [or, og, ob] = getPixel(movedPng, 210, 126);
    expect(or).toBeLessThan(30);
    expect(og).toBeLessThan(40);
    expect(ob).toBeGreaterThan(30);
  });
});
