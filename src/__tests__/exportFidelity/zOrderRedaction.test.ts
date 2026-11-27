import { describe, expect, it } from 'vitest';
import Konva from 'konva';
import { PNG } from 'pngjs';
import { composeWithAnnotations, composeAnnotatedScreenImage } from '../../compose/composeWithAnnotations';
import { createTestImageElement } from '../utils/exportFidelity';
import { V1_PLAIN, V4_FULL_PRESET } from '../utils/testPresets';
import { getCompositionDimensions } from '../../compose/core';
import type {
  ArrowObject,
  BlurObject,
  NumberedObject,
  OpaqueRedactObject,
  PixelateObject,
  RectangleObject,
} from '../../annotate/state/types';

function decodePng(bytes: Uint8Array): PNG {
  return PNG.sync.read(Buffer.from(bytes));
}

function getPixel(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (y * png.width + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

describe('export fidelity — HiDPI pixelRatio, Z-order redaction & Studio screen bake', () => {
  it('locks offscreen Konva layer pixelRatio to 1 when global Konva.pixelRatio = 2', async () => {
    const img = await createTestImageElement(800, 600);
    const dims = getCompositionDimensions(img.width, img.height, V4_FULL_PRESET);

    const objs: [RectangleObject, ArrowObject, NumberedObject] = [
      {
        id: 'r-tl',
        type: 'rectangle',
        x: 60,
        y: 60,
        rotation: 0,
        draggable: false,
        width: 80,
        height: 50,
        stroke: '#ff0000',
        strokeWidth: 6,
        lineStyle: 'solid',
        cornerRadius: 0,
      },
      {
        id: 'a-br',
        type: 'arrow',
        x: dims.canvasW - 140,
        y: dims.canvasH - 90,
        rotation: 0,
        draggable: false,
        points: [0, 0, 80, 30],
        stroke: '#00ff00',
        strokeWidth: 8,
        pointerLength: 14,
        pointerWidth: 14,
        style: 'solid',
      },
      {
        id: 'n-br',
        type: 'numbered',
        x: dims.canvasW - 60,
        y: dims.canvasH - 60,
        rotation: 0,
        draggable: false,
        displayNumber: 9,
        radius: 18,
        fill: '#ef4444',
      },
    ];

    const originalPixelRatio = Konva.pixelRatio;
    try {
      Konva.pixelRatio = 1;
      const bytes1x = await composeWithAnnotations(img, V4_FULL_PRESET, objs, 'image/png', 1.0);

      Konva.pixelRatio = 2;
      const bytes2x = await composeWithAnnotations(img, V4_FULL_PRESET, objs, 'image/png', 1.0);

      const png1x = decodePng(bytes1x);
      const png2x = decodePng(bytes2x);
      expect(png2x.width).toBe(png1x.width);
      expect(png2x.height).toBe(png1x.height);

      // Verify bottom-right numbered badge fill (#ef4444) is present inside badge ring away from white digit center
      const [r, g, b] = getPixel(png2x, dims.canvasW - 60, dims.canvasH - 72);
      expect(r).toBeGreaterThan(200);
      expect(g).toBeLessThan(120);
      expect(b).toBeLessThan(120);

      expect(Buffer.compare(png2x.data, png1x.data)).toBe(0);
    } finally {
      Konva.pixelRatio = originalPixelRatio;
    }
  });

  it('renders annotations and opaque_redact/blur/pixelate in exact document Z-order without bleed-through', async () => {
    const img = await createTestImageElement(400, 300);

    // 1) Earlier bright red rect occluded completely by later opaque_redact
    const earlierRect: RectangleObject = {
      id: 'rect-under',
      type: 'rectangle',
      x: 100,
      y: 80,
      rotation: 0,
      draggable: false,
      width: 120,
      height: 80,
      stroke: '#ff0000',
      strokeWidth: 10,
      lineStyle: 'solid',
      cornerRadius: 0,
    };
    const laterRedact: OpaqueRedactObject = {
      id: 'redact-over',
      type: 'opaque_redact',
      x: 80,
      y: 60,
      rotation: 0,
      draggable: false,
      width: 160,
      height: 120,
      fill: '#000000',
      borderColor: '#000000',
      borderWidth: 0,
    };

    const occludedBytes = await composeWithAnnotations(
      img,
      V1_PLAIN,
      [earlierRect, laterRedact],
      'image/png',
      1.0
    );
    const occludedPng = decodePng(occludedBytes);
    for (let y = 70; y < 170; y++) {
      for (let x = 90; x < 230; x++) {
        const [r, g, b] = getPixel(occludedPng, x, y);
        expect([r, g, b]).toEqual([0, 0, 0]);
      }
    }

    // 2) Earlier opaque_redact followed by later bright green rect -> green rect renders on top
    const earlierRedact: OpaqueRedactObject = {
      ...laterRedact,
      id: 'redact-under',
    };
    const laterRect: RectangleObject = {
      id: 'rect-over',
      type: 'rectangle',
      x: 120,
      y: 100,
      rotation: 0,
      draggable: false,
      width: 80,
      height: 40,
      stroke: '#00ff00',
      strokeWidth: 6,
      lineStyle: 'solid',
      cornerRadius: 0,
    };

    const overBytes = await composeWithAnnotations(
      img,
      V1_PLAIN,
      [earlierRedact, laterRect],
      'image/png',
      1.0
    );
    const overPng = decodePng(overBytes);
    const [gr, gg, gb] = getPixel(overPng, 160, 100);
    expect(gg).toBeGreaterThan(200);
    expect(gr).toBeLessThan(40);
    expect(gb).toBeLessThan(40);

    // 3) Blur / Pixelate sample refreshed canvas containing flushed earlier vector strokes
    const brightStroke: RectangleObject = {
      id: 'rect-blur-target',
      type: 'rectangle',
      x: 110,
      y: 110,
      rotation: 0,
      draggable: false,
      width: 80,
      height: 40,
      stroke: '#ff00ff',
      strokeWidth: 8,
      lineStyle: 'solid',
      cornerRadius: 0,
    };
    const pixelateOver: PixelateObject = {
      id: 'px-over',
      type: 'pixelate',
      x: 100,
      y: 100,
      rotation: 0,
      draggable: false,
      width: 100,
      height: 60,
      pixelSize: 20,
      borderColor: '#000000',
      borderWidth: 0,
    };
    const blurOver: BlurObject = {
      id: 'blur-over',
      type: 'blur',
      x: 100,
      y: 100,
      rotation: 0,
      draggable: false,
      width: 100,
      height: 60,
      blurRadius: 12,
    };

    const pxBytes = await composeWithAnnotations(
      img,
      V1_PLAIN,
      [brightStroke, pixelateOver],
      'image/png',
      1.0
    );
    const pxPng = decodePng(pxBytes);
    // At center-edge where bright #ff00ff stroke lives (110, 110), pixelation samples magenta into the block
    // whereas raw background has zero magenta. Check at least one pixel around (110, 110) has elevated red+blue > green.
    let sampledMagenta = false;
    for (let y = 104; y <= 118; y++) {
      for (let x = 104; x <= 118; x++) {
        const [pr, pg, pb] = getPixel(pxPng, x, y);
        if (pr > pg + 20 && pb > pg + 20) {
          sampledMagenta = true;
        }
      }
    }
    expect(sampledMagenta).toBe(true);

    // Ensure blur after vector does not crash and produces valid PNG
    const blurBytes = await composeWithAnnotations(
      img,
      V1_PLAIN,
      [brightStroke, blurOver],
      'image/png',
      1.0
    );
    expect(decodePng(blurBytes).width).toBe(400);
  });

  it('composeAnnotatedScreenImage extracts screenshot sub-rectangle with annotations and without 2D outer padding/frame', async () => {
    const img = await createTestImageElement(320, 200);
    const dims = getCompositionDimensions(img.width, img.height, V4_FULL_PRESET);

    // Place a solid green rectangle inside the screenshot area (shifted by drawX, drawY)
    const inScreenRect: RectangleObject = {
      id: 'screen-rect',
      type: 'rectangle',
      x: dims.drawX + 40,
      y: dims.drawY + 40,
      rotation: 0,
      draggable: false,
      width: 80,
      height: 50,
      stroke: '#00ff00',
      strokeWidth: 8,
      lineStyle: 'solid',
      cornerRadius: 0,
    };

    const baked = await composeAnnotatedScreenImage(img, V4_FULL_PRESET, [inScreenRect]);
    expect(baked.width).toBe(img.width);
    expect(baked.height).toBe(img.height);

    // Also verify fast-path when objects.length === 0 returns exact screen dimensions
    const fastBaked = await composeAnnotatedScreenImage(img, V4_FULL_PRESET, []);
    expect(fastBaked.width).toBe(img.width);
    expect(fastBaked.height).toBe(img.height);
  });
});
