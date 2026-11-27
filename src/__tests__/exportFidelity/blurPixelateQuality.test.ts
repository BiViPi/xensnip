import { describe, expect, it } from 'vitest';
import { createCanvas } from 'canvas';
import { getCanvasRenderScale } from '../../measure/coordinates';
import { createBlurredCanvas } from '../../annotate/renderers/BlurRenderer';
import { createPixelatedCanvas } from '../../annotate/renderers/PixelateRenderer';

describe('Blur & Pixelate fidelity and HiDPI preview sampling', () => {
  it('maps stage coordinates to 1.5x HiDPI backing canvas via getCanvasRenderScale', () => {
    const stageW = 400;
    const stageH = 300;
    const renderScale = 1.5;

    const backing = createCanvas(stageW * renderScale, stageH * renderScale);
    const bctx = backing.getContext('2d');
    // Paint background dark grey (#2d2d2d) everywhere (including backing y=195..225 where 1x bug used to sample)
    bctx.fillStyle = '#2d2d2d';
    bctx.fillRect(0, 0, backing.width, backing.height);

    // Paint bright yellow bar at stage y=[190..220], x=[80..200] -> backing y=[285..330], x=[120..300]
    bctx.fillStyle = '#f5c518';
    bctx.fillRect(80 * renderScale, 190 * renderScale, 120 * renderScale, 30 * renderScale);

    const backingEl = backing as unknown as HTMLCanvasElement;
    const { scaleX, scaleY } = getCanvasRenderScale(backingEl, stageW, stageH);
    expect(scaleX).toBeCloseTo(1.5, 5);
    expect(scaleY).toBeCloseTo(1.5, 5);

    const stageRect = { x: 100, y: 195, width: 80, height: 20 };
    const sampleRect = {
      x: stageRect.x * scaleX,
      y: stageRect.y * scaleY,
      width: stageRect.width * scaleX,
      height: stageRect.height * scaleY,
    };

    const blurred = createBlurredCanvas(backingEl, sampleRect, stageRect.width, stageRect.height, 8);
    expect(blurred).not.toBeNull();
    const blurCtx = blurred!.getContext('2d')!;
    const blurCenter = blurCtx.getImageData(40, 10, 1, 1).data;
    expect(blurCenter[0]).toBeGreaterThan(200);
    expect(blurCenter[1]).toBeGreaterThan(150);
    expect(blurCenter[2]).toBeLessThan(60);

    const pixelated = createPixelatedCanvas(backingEl, sampleRect, stageRect.width, stageRect.height, 10);
    expect(pixelated).not.toBeNull();
    const pxCtx = pixelated!.getContext('2d')!;
    const pxCenter = pxCtx.getImageData(40, 10, 1, 1).data;
    expect(pxCenter[0]).toBeGreaterThan(200);
    expect(pxCenter[1]).toBeGreaterThan(150);
    expect(pxCenter[2]).toBeLessThan(60);
  });

  it('pixelates thin white UI text into crisp uniform mosaic tiles instead of collapsing to background', () => {
    const src = createCanvas(200, 44);
    const ctx = src.getContext('2d');
    ctx.fillStyle = '#3b3014';
    ctx.fillRect(0, 0, 200, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('press the key to capture', 10, 27);

    const pixelSize = 12;
    const out = createPixelatedCanvas(
      src as unknown as HTMLCanvasElement,
      { x: 0, y: 0, width: 200, height: 44 },
      200,
      44,
      pixelSize
    );
    expect(out).not.toBeNull();

    const data = out!.getContext('2d')!.getImageData(0, 0, 200, 44).data;
    let distinctBlocks = 0;

    for (let by = 0; by < 44; by += pixelSize) {
      const yEnd = Math.min(44, by + pixelSize);
      for (let bx = 0; bx < 200; bx += pixelSize) {
        const xEnd = Math.min(200, bx + pixelSize);
        const baseIdx = (by * 200 + bx) * 4;
        const br = data[baseIdx];
        const bg = data[baseIdx + 1];
        const bb = data[baseIdx + 2];
        const ba = data[baseIdx + 3];

        if (Math.abs(br - 0x3b) > 8 || Math.abs(bg - 0x30) > 8 || Math.abs(bb - 0x14) > 8) {
          distinctBlocks++;
        }

        // Every pixel inside the tile must match identically
        for (let py = by; py < yEnd; py++) {
          for (let px = bx; px < xEnd; px++) {
            const idx = (py * 200 + px) * 4;
            expect([data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]).toEqual([br, bg, bb, ba]);
          }
        }
      }
    }

    expect(distinctBlocks).toBeGreaterThanOrEqual(10);
  });

  it('blurs high-contrast edges cleanly while keeping opaque edges with zero transparent halo', () => {
    const src = createCanvas(160, 80);
    const ctx = src.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 160, 80);
    ctx.fillStyle = '#ffffff';
    for (let x = 20; x < 140; x += 12) {
      ctx.fillRect(x, 15, 4, 50);
    }

    const out = createBlurredCanvas(
      src as unknown as HTMLCanvasElement,
      { x: 20, y: 10, width: 120, height: 60 },
      120,
      60,
      10
    );
    expect(out).not.toBeNull();

    const data = out!.getContext('2d')!.getImageData(0, 0, 120, 60).data;

    // Zero transparent halo at all 4 borders
    for (let x = 0; x < 120; x++) {
      expect(data[(0 * 120 + x) * 4 + 3]).toBe(255);
      expect(data[(59 * 120 + x) * 4 + 3]).toBe(255);
    }
    for (let y = 0; y < 60; y++) {
      expect(data[(y * 120 + 0) * 4 + 3]).toBe(255);
      expect(data[(y * 120 + 119) * 4 + 3]).toBe(255);
    }

    // Center stripes should be heavily smoothed compared to crisp #ffffff (255) - #111827 (17..39)
    let maxHorizStep = 0;
    const midY = 30;
    for (let x = 10; x < 109; x++) {
      const i1 = (midY * 120 + x) * 4;
      const i2 = (midY * 120 + x + 1) * 4;
      maxHorizStep = Math.max(maxHorizStep, Math.abs(data[i2] - data[i1]));
    }
    expect(maxHorizStep).toBeLessThan(60);
  });
});
