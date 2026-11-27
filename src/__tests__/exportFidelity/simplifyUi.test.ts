import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createCanvas, loadImage } from 'canvas';
import { PNG } from 'pngjs';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createSimplifyUiCanvas } from '../../annotate/renderers/SimplifyUiRenderer';
import { SimplifyUiToolbar } from '../../annotate/floating/SimplifyUiToolbar';
import { getCanvasRenderScale } from '../../measure/coordinates';
import { useAnnotationStore } from '../../annotate/state/store';
import { V1_PLAIN } from '../utils/testPresets';
import type { SimplifyUiObject } from '../../annotate/state/types';

function decodePng(bytes: Uint8Array): PNG {
  return PNG.sync.read(Buffer.from(bytes));
}

function getPixel(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (y * png.width + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

function drawUiFixture(scale = 1) {
  const w = Math.round(400 * scale);
  const h = Math.round(300 * scale);
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);

  // Textured outer wallpaper
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 400, 300);
  ctx.fillStyle = '#f97316';
  for (let x = 260; x < 390; x += 16) {
    ctx.fillRect(x, 20, 8, 260);
  }

  // UI card inside [40..240, 40..220]
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, 40, 200, 180);

  // Simulated heading & body glyph stripes
  ctx.fillStyle = '#ffffff';
  for (let gx = 56; gx < 164; gx += 6) {
    ctx.fillRect(gx, 60, 4, 10);
  }
  ctx.fillStyle = '#94a3b8';
  for (let gx = 56; gx < 200; gx += 5) {
    ctx.fillRect(gx, 84, 3, 7);
  }

  // Simulated subtle low-contrast secondary label
  ctx.fillStyle = '#334155';
  ctx.fillRect(56, 102, 88, 6);

  // Simulated primary button + label
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(56, 122, 84, 24);
  ctx.fillStyle = '#ffffff';
  for (let gx = 68; gx < 128; gx += 6) {
    ctx.fillRect(gx, 130, 4, 8);
  }

  return c;
}

function drawWhiteDocWithWordsFixture() {
  const c = createCanvas(320, 180);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 320, 180);

  // 2 lines of crisp dark text, separated vertically by 12px (y=40..50 and y=62..72),
  // each line containing 4 separate words separated by 7px white gaps.
  ctx.fillStyle = '#0f172a';
  const wordStarts = [44, 86, 132, 180];
  const wordWidths = [35, 39, 41, 36];
  for (const lineY of [40, 62]) {
    for (let i = 0; i < wordStarts.length; i++) {
      ctx.fillRect(wordStarts[i], lineY, wordWidths[i], 10);
    }
  }
  return c;
}

async function canvasToImageElement(canvas: ReturnType<typeof createCanvas>): Promise<HTMLImageElement> {
  const img = await loadImage(canvas.toBuffer('image/png'));
  return img as unknown as HTMLImageElement;
}

function countHorizontalRuns(canvas: HTMLCanvasElement, y: number, x0: number, x1: number): number {
  const ctx = canvas.getContext('2d')!;
  const row = ctx.getImageData(0, y, canvas.width, 1).data;
  let runs = 0;
  let inRun = false;
  for (let x = x0; x <= x1; x++) {
    const idx = x * 4;
    const isDark = row[idx] < 240 || row[idx + 1] < 240 || row[idx + 2] < 240;
    if (isDark && !inRun) {
      runs++;
      inRun = true;
    } else if (!isDark) {
      inRun = false;
    }
  }
  return runs;
}

describe('Simplify UI — Direction A Auto-Skeleton export fidelity & HiDPI (T013)', () => {
  let overlay: HTMLDivElement;

  beforeEach(() => {
    overlay = document.createElement('div');
    overlay.id = 'annotation-ui-overlay';
    document.body.appendChild(overlay);
    useAnnotationStore.setState({
      objects: [],
      selectedIds: [],
      editingTextId: null,
      toolbarCollapsed: false,
    });
  });

  afterEach(() => {
    cleanup();
    overlay.remove();
  });

  it('replaces inner UI text with clean wireframe bars while leaving 0 pixels altered outside rounded region', async () => {
    const uiCanvas = drawUiFixture(1);
    const img = await canvasToImageElement(uiCanvas);

    const obj: SimplifyUiObject = {
      id: 'sui-1',
      type: 'simplify_ui',
      x: 40,
      y: 40,
      rotation: 0,
      width: 200,
      height: 180,
      dimOpacity: 0.52,
      blockOpacity: 0.65,
      blurRadius: 4,
      detailLevel: 65,
      saturation: 0.35,
      cornerRadius: 24,
      draggable: true,
    };

    const [baseBytes, actualBytes] = await Promise.all([
      composeWithAnnotations(img, V1_PLAIN, [], 'image/png', 1.0),
      composeWithAnnotations(img, V1_PLAIN, [obj], 'image/png', 1.0),
    ]);

    const basePng = decodePng(baseBytes);
    const actualPng = decodePng(actualBytes);

    let outsideDiff = 0;
    for (let y = 0; y < basePng.height; y++) {
      for (let x = 0; x < basePng.width; x++) {
        const inBoundingBox = x >= obj.x && x < obj.x + obj.width && y >= obj.y && y < obj.y + obj.height;
        if (!inBoundingBox) {
          const [br, bg, bb, ba] = getPixel(basePng, x, y);
          const [ar, ag, ab, aa] = getPixel(actualPng, x, y);
          if (br !== ar || bg !== ag || bb !== ab || ba !== aa) {
            outsideDiff++;
          }
        }
      }
    }
    expect(outsideDiff).toBe(0);

    // Corner pixel just inside bounding box (41, 41) outside cornerRadius=24 arc remains untouched
    expect(getPixel(actualPng, 41, 41)).toEqual(getPixel(basePng, 41, 41));

    // Inside heading text stripe y=64: raw crisp #ffffff glyphs (255,255,255) are skeletonized (no bright white spikes)
    let rawWhiteGlyphPixels = 0;
    let skeletonizedPixels = 0;
    for (let x = 56; x < 164; x++) {
      const [r, g, b] = getPixel(actualPng, x, 64);
      if (r > 245 && g > 245 && b > 245) rawWhiteGlyphPixels++;
      if (r > 40 || g > 50 || b > 70) skeletonizedPixels++;
    }
    expect(rawWhiteGlyphPixels).toBe(0);
    expect(skeletonizedPixels).toBeGreaterThan(20);
  });

  it('blends seamlessly with white background (0 border/gray smudge) and scales clearly from detail 0 -> 50 -> 100', () => {
    const docCanvas = drawWhiteDocWithWordsFixture() as unknown as HTMLCanvasElement;
    const region = { x: 24, y: 20, width: 220, height: 80 };

    const outDetail0 = createSimplifyUiCanvas(docCanvas, region, 220, 80, {
      detailLevel: 0,
      blockOpacity: 0.52,
      blurRadius: 4,
      cornerRadius: 12,
    })!;
    const outDetail50 = createSimplifyUiCanvas(docCanvas, region, 220, 80, {
      detailLevel: 50,
      blockOpacity: 0.52,
      blurRadius: 4,
      cornerRadius: 12,
    })!;
    const outDetail100 = createSimplifyUiCanvas(docCanvas, region, 220, 80, {
      detailLevel: 100,
      blockOpacity: 0.52,
      blurRadius: 4,
      cornerRadius: 12,
    })!;

    // Zero border rim & seamless pure white background at inner margin y=2
    const edgeCtx = outDetail50.getContext('2d')!;
    const topMarginPixel = Array.from(edgeCtx.getImageData(110, 1, 1, 1).data);
    const leftEdgePixel = Array.from(edgeCtx.getImageData(1, 40, 1, 1).data);
    expect(topMarginPixel).toEqual([255, 255, 255, 255]);
    expect(leftEdgePixel).toEqual([255, 255, 255, 255]);

    // Inter-line gap in local coords: line 1 y=20..30, gap y=31..41, line 2 y=42..52
    // At detail=0, lines merge across y=36 into 1 macro block
    expect(countHorizontalRuns(outDetail0, 36, 15, 205)).toBe(1);

    // At detail=50, gap y=36 stays pure white (lines separated) and line 1 forms 1 bar across 7px word spaces
    expect(countHorizontalRuns(outDetail50, 36, 15, 205)).toBe(0);
    expect(countHorizontalRuns(outDetail50, 25, 15, 205)).toBe(1);

    // At detail=100, line 1 splits cleanly into 4 separate word pills
    expect(countHorizontalRuns(outDetail100, 36, 15, 205)).toBe(0);
    expect(countHorizontalRuns(outDetail100, 25, 15, 205)).toBe(4);
  });

  it('supports multiple independent Simplify UI regions and tunes contrast/detail predictably', async () => {
    const uiCanvas = drawUiFixture(1);
    const img = await canvasToImageElement(uiCanvas);

    const lowContrast: SimplifyUiObject = {
      id: 'sui-low',
      type: 'simplify_ui',
      x: 40,
      y: 40,
      rotation: 0,
      width: 200,
      height: 120,
      dimOpacity: 0.2,
      blockOpacity: 0.2,
      blurRadius: 4,
      detailLevel: 60,
      saturation: 0.35,
      cornerRadius: 12,
      draggable: true,
    };

    const highContrast: SimplifyUiObject = {
      ...lowContrast,
      id: 'sui-high',
      dimOpacity: 0.85,
      blockOpacity: 0.85,
    };

    const secondRegion: SimplifyUiObject = {
      id: 'sui-second',
      type: 'simplify_ui',
      x: 256,
      y: 20,
      rotation: 0,
      width: 120,
      height: 100,
      dimOpacity: 0.52,
      blockOpacity: 0.55,
      blurRadius: 4,
      detailLevel: 60,
      saturation: 0.35,
      cornerRadius: 12,
      draggable: true,
    };

    const [lowBytes, highBytes, multiBytes, baseBytes] = await Promise.all([
      composeWithAnnotations(img, V1_PLAIN, [lowContrast], 'image/png', 1.0),
      composeWithAnnotations(img, V1_PLAIN, [highContrast], 'image/png', 1.0),
      composeWithAnnotations(img, V1_PLAIN, [lowContrast, secondRegion], 'image/png', 1.0),
      composeWithAnnotations(img, V1_PLAIN, [], 'image/png', 1.0),
    ]);

    const lowPng = decodePng(lowBytes);
    const highPng = decodePng(highBytes);
    const multiPng = decodePng(multiBytes);
    const basePng = decodePng(baseBytes);

    const avgLuminance = (png: PNG) => {
      let sum = 0;
      let count = 0;
      for (let x = 58; x < 158; x++) {
        const [r, g, b] = getPixel(png, x, 64);
        sum += r + g + b;
        count++;
      }
      return sum / count;
    };
    expect(avgLuminance(highPng)).toBeGreaterThan(avgLuminance(lowPng));

    expect(getPixel(multiPng, 10, 10)).toEqual(getPixel(basePng, 10, 10));
    expect(getPixel(multiPng, 10, 280)).toEqual(getPixel(basePng, 10, 280));
  });

  it('samples 1.5x HiDPI backing canvas accurately and updates only selected object from SimplifyUiToolbar', () => {
    const hiDpi = drawUiFixture(1.5) as unknown as HTMLCanvasElement;
    const { scaleX, scaleY } = getCanvasRenderScale(hiDpi, 400, 300);
    expect(scaleX).toBeCloseTo(1.5, 5);
    expect(scaleY).toBeCloseTo(1.5, 5);

    const out = createSimplifyUiCanvas(
      hiDpi,
      { x: 40 * scaleX, y: 40 * scaleY, width: 200 * scaleX, height: 180 * scaleY },
      200,
      180,
      { detailLevel: 65, blockOpacity: 0.6, blurRadius: 4, cornerRadius: 16 }
    );
    expect(out).not.toBeNull();
    expect(out!.width).toBe(200);
    expect(out!.height).toBe(180);

    const obj: SimplifyUiObject = {
      id: 'sui-toolbar',
      type: 'simplify_ui',
      x: 40,
      y: 40,
      rotation: 0,
      width: 200,
      height: 180,
      dimOpacity: 0.52,
      blockOpacity: 0.52,
      blurRadius: 4,
      detailLevel: 50,
      saturation: 0.35,
      cornerRadius: 16,
      draggable: true,
    };

    useAnnotationStore.setState({
      objects: [obj],
      selectedIds: [obj.id],
    });
    const beforeDefaults = JSON.stringify(useAnnotationStore.getState().getToolDefaults());

    const { rerender } = render(
      React.createElement(SimplifyUiToolbar, {
        anchor: { left: 40, top: 80, width: 200, height: 180 },
        obj,
      })
    );

    const sectionBtns = overlay.querySelectorAll('.xs-toolbar-section .xs-toolbar-btn');
    // [0] Detail (0..100), [1] Contrast, [2] Corner Radius
    fireEvent.click(sectionBtns[0]);
    const detailSlider = overlay.querySelector('input[type="range"]') as HTMLInputElement;
    expect(detailSlider.min).toBe('0');
    fireEvent.change(detailSlider, { target: { value: '0' } });
    expect((useAnnotationStore.getState().objects[0] as SimplifyUiObject).detailLevel).toBe(0);

    const updatedObj1 = useAnnotationStore.getState().objects[0] as SimplifyUiObject;
    rerender(
      React.createElement(SimplifyUiToolbar, {
        anchor: { left: 40, top: 80, width: 200, height: 180 },
        obj: updatedObj1,
      })
    );
    fireEvent.click(sectionBtns[1]);
    const contrastSlider = overlay.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(contrastSlider, { target: { value: '80' } });
    const updatedObj2 = useAnnotationStore.getState().objects[0] as SimplifyUiObject;
    expect(updatedObj2.blockOpacity).toBeCloseTo(0.8, 5);
    expect(JSON.stringify(useAnnotationStore.getState().getToolDefaults())).toBe(beforeDefaults);
  });
});
