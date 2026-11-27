import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createCanvas, loadImage } from 'canvas';
import { PNG } from 'pngjs';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import {
  syncMagnifyForDrag,
  syncMagnifyForResize,
  syncMagnifyForZoom,
} from '../../annotate/renderers/MagnifyRenderer';
import { createDragAnnotationObject } from '../../annotate/pointer/dragObjectFactory';
import { MagnifyToolbar } from '../../annotate/floating/MagnifyToolbar';
import { useAnnotationStore } from '../../annotate/state/store';
import { V1_PLAIN } from '../utils/testPresets';
import type { MagnifyObject } from '../../annotate/state/types';

function decodePng(bytes: Uint8Array): PNG {
  return PNG.sync.read(Buffer.from(bytes));
}

function getPixel(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (y * png.width + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

async function createTargetCanvasImage(): Promise<HTMLImageElement> {
  const c = createCanvas(400, 300);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 400, 300);

  // Target A: bright red block at center (90, 80)
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(75, 65, 30, 30);

  // Target B: bright green block at center (260, 190)
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(245, 175, 30, 30);

  const img = await loadImage(c.toBuffer('image/png'));
  return img as unknown as HTMLImageElement;
}

describe('Magnify — dynamic drag/resize/zoom sync & export fidelity (T015)', () => {
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

  const baseLoupe: MagnifyObject = {
    id: 'mag-1',
    type: 'magnify',
    x: 45,
    y: 45,
    rotation: 0,
    width: 90,
    height: 70,
    sourceX: 75,
    sourceY: 68.33333333333333,
    sourceWidth: 30,
    sourceHeight: 23.333333333333332,
    zoom: 3,
    cornerRadius: 16,
    borderOpacity: 0.8,
    draggable: true,
  };

  it('centers newly dragged Magnify loupes over the selection and maintains 1:1 alignment at 100% zoom', async () => {
    const img = await createTargetCanvasImage();
    const created = createDragAnnotationObject(
      'magnify',
      { x: 60, y: 50 },
      { x: 160, y: 110 },
      'mag-birth'
    ) as MagnifyObject;

    expect(created.x + created.width / 2).toBeCloseTo(110, 5);
    expect(created.y + created.height / 2).toBeCloseTo(80, 5);
    expect(created.sourceX + created.sourceWidth / 2).toBeCloseTo(110, 5);
    expect(created.sourceY + created.sourceHeight / 2).toBeCloseTo(80, 5);

    // Move over Target B center (260, 190) and zoom to 100% -> 0 positional offset
    const moved = {
      ...created,
      ...syncMagnifyForDrag(
        created,
        260 - created.width / 2,
        190 - created.height / 2
      ),
    };
    const at100: MagnifyObject = {
      ...moved,
      ...syncMagnifyForZoom(moved, 1.0),
    };
    expect(at100.sourceX).toBeCloseTo(at100.x, 5);
    expect(at100.sourceY).toBeCloseTo(at100.y, 5);
    expect(at100.sourceWidth).toBeCloseTo(at100.width, 5);
    expect(at100.sourceHeight).toBeCloseTo(at100.height, 5);

    const [basePng, outPng] = await Promise.all([
      composeWithAnnotations(img, V1_PLAIN, [], 'image/png', 1.0).then(decodePng),
      composeWithAnnotations(img, V1_PLAIN, [at100], 'image/png', 1.0).then(decodePng),
    ]);

    // Verify all interior pixels inside Target B (248..272, 178..202) match background 1:1 with zero shift
    expect(getPixel(outPng, 248, 178)).toEqual(getPixel(basePng, 248, 178));
    expect(getPixel(outPng, 260, 190)).toEqual(getPixel(basePng, 260, 190));
    expect(getPixel(outPng, 272, 202)).toEqual(getPixel(basePng, 272, 202));
  });

  it('maintains symmetric zoom ratios, drag delta sync, and >= 4 source bounds on resize', () => {
    const dragged = syncMagnifyForDrag(baseLoupe, 215, 155);
    expect(dragged.x).toBe(215);
    expect(dragged.y).toBe(155);
    expect(dragged.sourceX).toBeCloseTo(baseLoupe.sourceX + 170, 5);
    expect(dragged.sourceY).toBeCloseTo(baseLoupe.sourceY + 110, 5);

    const zoomed = syncMagnifyForZoom(baseLoupe, 5.5); // clamped to 4.0
    expect(zoomed.zoom).toBe(4);
    expect(zoomed.sourceWidth).toBeCloseTo(90 / 4, 5);
    expect(zoomed.sourceHeight).toBeCloseTo(70 / 4, 5);
    expect(zoomed.sourceX + zoomed.sourceWidth / 2).toBeCloseTo(
      baseLoupe.sourceX + baseLoupe.sourceWidth / 2,
      5
    );

    const resized = syncMagnifyForResize(baseLoupe, 30, 30, 180, 120, 0);
    expect(resized.width).toBe(180);
    expect(resized.height).toBe(120);
    expect(resized.sourceWidth).toBeCloseTo(180 / 3, 5);
    expect(resized.sourceHeight).toBeCloseTo(120 / 3, 5);
    expect(resized.sourceWidth).toBeGreaterThanOrEqual(4);
  });

  it('tracks moved target pixels accurately in export and clamps near-edge crops safely', async () => {
    const img = await createTargetCanvasImage();

    const firstExport = decodePng(
      await composeWithAnnotations(img, V1_PLAIN, [baseLoupe], 'image/png', 1.0)
    );
    const [r1, g1, b1] = getPixel(firstExport, 90, 80);
    expect(r1).toBeGreaterThan(220);
    expect(g1).toBeLessThan(30);
    expect(b1).toBeLessThan(30);

    // Drag loupe over Target B center (260, 190) => dx = +170, dy = +110
    const moved: MagnifyObject = {
      ...baseLoupe,
      ...syncMagnifyForDrag(baseLoupe, baseLoupe.x + 170, baseLoupe.y + 110),
    };
    const secondExport = decodePng(
      await composeWithAnnotations(img, V1_PLAIN, [moved], 'image/png', 1.0)
    );
    const [r2, g2, b2] = getPixel(secondExport, 260, 190);
    expect(g2).toBeGreaterThan(220);
    expect(r2).toBeLessThan(30);
    expect(b2).toBeLessThan(30);

    // Out-of-bounds negative source coordinates never throw
    const edgeLoupe: MagnifyObject = {
      ...baseLoupe,
      id: 'mag-edge',
      x: 10,
      y: 10,
      sourceX: -20,
      sourceY: -15,
      sourceWidth: 45,
      sourceHeight: 35,
      zoom: 2,
    };
    const edgeExport = decodePng(
      await composeWithAnnotations(img, V1_PLAIN, [edgeLoupe], 'image/png', 1.0)
    );
    expect(edgeExport.width).toBe(400);
    expect(edgeExport.height).toBe(300);
  });

  it('MagnifyToolbar zoom slider updates sourceWidth/sourceHeight and keeps crop centered', () => {
    const mag: MagnifyObject = {
      ...baseLoupe,
      width: 120,
      height: 80,
      zoom: 2,
      sourceX: 75,
      sourceY: 65,
      sourceWidth: 60,
      sourceHeight: 40,
    };

    useAnnotationStore.setState({
      objects: [mag],
      selectedIds: [mag.id],
    });

    render(
      React.createElement(MagnifyToolbar, {
        anchor: { left: 45, top: 45, width: 120, height: 80 },
        obj: mag,
      })
    );

    const sectionBtns = overlay.querySelectorAll('.xs-toolbar-section .xs-toolbar-btn');
    fireEvent.click(sectionBtns[0]);
    const zoomSlider = overlay.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(zoomSlider, { target: { value: '300' } });

    const updated = useAnnotationStore.getState().objects[0] as MagnifyObject;
    expect(updated.zoom).toBe(3);
    expect(updated.sourceWidth).toBeCloseTo(120 / 3, 5);
    expect(updated.sourceHeight).toBeCloseTo(80 / 3, 5);
    expect(updated.sourceX + updated.sourceWidth / 2).toBeCloseTo(updated.x + updated.width / 2, 5);
    expect(updated.sourceY + updated.sourceHeight / 2).toBeCloseTo(updated.y + updated.height / 2, 5);
  });
});
