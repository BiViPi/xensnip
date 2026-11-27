import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { loadImage } from 'canvas';
import { PNG } from 'pngjs';
import {
  getContrastInkColor,
  getNextNumberedStep,
} from '../renderers/NumberedRenderer';
import { stabilizeFreehandTail } from '../pointer/freehandArrowPointer';
import { NumberedToolbar } from '../floating/NumberedToolbar';
import { FreehandArrowToolbar } from '../floating/FreehandArrowToolbar';
import { useAnnotationStore } from '../state/store';
import { registerHistoryRecorder, resetHistoryGestures } from '../../editor/historyBridge';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageBuffer } from '../../__tests__/utils/exportFidelity';
import { V1_PLAIN } from '../../__tests__/utils/testPresets';
import type { FreehandArrowObject, NumberedObject } from '../state/types';

const ANCHOR = { left: 100, top: 100, width: 80, height: 80 };

function makeNumbered(id: string, displayNumber: number, fill = '#ef4444'): NumberedObject {
  return {
    id,
    type: 'numbered',
    x: 100 + displayNumber * 40,
    y: 100,
    rotation: 0,
    displayNumber,
    radius: 18,
    fill,
    draggable: true,
  };
}

describe('Numbered Steps & Freehand Arrow stabilization (T024)', () => {
  let overlay: HTMLDivElement;

  beforeEach(() => {
    overlay = document.createElement('div');
    overlay.id = 'annotation-ui-overlay';
    document.body.appendChild(overlay);
    resetHistoryGestures();
    registerHistoryRecorder(null);
    useAnnotationStore.setState({
      objects: [],
      selectedIds: [],
      activeTool: 'select',
      editingTextId: null,
      toolbarCollapsed: false,
    });
  });

  afterEach(() => {
    cleanup();
    resetHistoryGestures();
    registerHistoryRecorder(null);
    overlay.remove();
  });

  it('computes max+1 step numbers and renumbers sequences in 1 atomic history snapshot', () => {
    const remaining = [makeNumbered('n-1', 1), makeNumbered('n-3', 3)];
    expect(getNextNumberedStep([])).toBe(1);
    expect(getNextNumberedStep(remaining)).toBe(4);

    const recorder = vi.fn();
    registerHistoryRecorder(recorder);

    useAnnotationStore.setState({
      objects: [makeNumbered('n-1', 1), makeNumbered('n-3', 3), makeNumbered('n-4', 4)],
      selectedIds: ['n-1'],
    });

    useAnnotationStore.getState().renumberSteps();
    const nums = useAnnotationStore
      .getState()
      .objects.filter((o): o is NumberedObject => o.type === 'numbered')
      .map((o) => o.displayNumber);
    expect(nums).toEqual([1, 2, 3]);
    expect(recorder).toHaveBeenCalledTimes(1);

    // Calling again when already sequential 1..N records 0 extra snapshots
    useAnnotationStore.getState().renumberSteps();
    expect(recorder).toHaveBeenCalledTimes(1);
  });

  it('selects dark ink on bright fills (#ffffff, #eab308) and white ink on dark fills (#3b82f6, #ef4444)', async () => {
    expect(getContrastInkColor('#ffffff')).toBe('#0f172a');
    expect(getContrastInkColor('#eab308')).toBe('#0f172a');
    expect(getContrastInkColor('#3b82f6')).toBe('#ffffff');
    expect(getContrastInkColor('#ef4444')).toBe('#ffffff');
    expect(getContrastInkColor('#000000')).toBe('#ffffff');

    const imgBuf = createTestImageBuffer(200, 200);
    const img = (await loadImage(imgBuf)) as unknown as HTMLImageElement;
    const whiteBadge: NumberedObject = {
      id: 'n-white',
      type: 'numbered',
      x: 100,
      y: 100,
      rotation: 0,
      displayNumber: 8,
      radius: 24,
      fill: '#ffffff',
      draggable: false,
    };

    const bytes = await composeWithAnnotations(img, V1_PLAIN, [whiteBadge], 'image/png', 1.0);
    const png = PNG.sync.read(Buffer.from(bytes));

    // Verify dark ink pixels (#0f172a) exist inside badge center (digit "8" is legible)
    let darkDigitPixels = 0;
    for (let y = 84; y <= 116; y++) {
      for (let x = 84; x <= 116; x++) {
        const idx = (y * png.width + x) * 4;
        if (png.data[idx] < 60 && png.data[idx + 1] < 60 && png.data[idx + 2] < 90) {
          darkDigitPixels++;
        }
      }
    }
    expect(darkDigitPixels).toBeGreaterThan(15);
  });

  it('NumberedToolbar adjusts badge size slider and triggers Renumber 1..N', () => {
    const n1 = makeNumbered('n-1', 1);
    const n3 = makeNumbered('n-3', 3);
    useAnnotationStore.setState({ objects: [n1, n3], selectedIds: ['n-1'] });

    render(React.createElement(NumberedToolbar, { anchor: ANCHOR, obj: n1 }));

    const sizeBtn = screen.getByRole('button', { name: 'Badge Size' });
    fireEvent.click(sizeBtn);
    const slider = overlay.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '28' } });

    const updatedN1 = useAnnotationStore.getState().objects[0] as NumberedObject;
    expect(updatedN1.radius).toBe(28);
    expect(useAnnotationStore.getState().getToolDefaults().numbered?.radius).toBe(28);

    const renumberBtn = screen.getByRole('button', { name: 'Renumber 1..N' });
    fireEvent.click(renumberBtn);

    const nums = useAnnotationStore
      .getState()
      .objects.filter((o): o is NumberedObject => o.type === 'numbered')
      .map((o) => o.displayNumber);
    expect(nums).toEqual([1, 2]);
  });

  it('FreehandArrowToolbar toggles both pointerLength and pointerWidth atomically and tail stabilization resists release flicks', () => {
    const fh: FreehandArrowObject = {
      id: 'fh-1',
      type: 'freehand_arrow',
      x: 10,
      y: 20,
      rotation: 0,
      points: [0, 0, 20, 0, 40, 0, 60, 0],
      stroke: '#ef4444',
      strokeWidth: 4,
      smoothing: 0.5,
      pointerLength: 12,
      pointerWidth: 12,
      draggable: true,
    };

    useAnnotationStore.setState({ objects: [fh], selectedIds: ['fh-1'] });
    const { rerender } = render(React.createElement(FreehandArrowToolbar, { anchor: ANCHOR, obj: fh }));

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Arrowhead' }));
    const disabled = useAnnotationStore.getState().objects[0] as FreehandArrowObject;
    expect(disabled.pointerLength).toBe(0);
    expect(disabled.pointerWidth).toBe(0);

    rerender(React.createElement(FreehandArrowToolbar, { anchor: ANCHOR, obj: disabled }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Arrowhead' }));
    const enabled = useAnnotationStore.getState().objects[0] as FreehandArrowObject;
    expect(enabled.pointerLength).toBe(12);
    expect(enabled.pointerWidth).toBe(12);

    // 4px downward release flick at the end of a rightward horizontal stroke
    const stabilized = stabilizeFreehandTail([0, 0, 20, 0, 40, 0, 60, 0, 60, 4], 14);
    const len = stabilized.length;
    const dx = stabilized[len - 2] - stabilized[len - 4];
    const dy = stabilized[len - 1] - stabilized[len - 3];
    expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(14);
    const angleDeg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
    expect(angleDeg).toBeLessThan(15);
  });
});
