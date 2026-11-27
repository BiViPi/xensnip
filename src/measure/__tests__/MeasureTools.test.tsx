import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ColorPickerToolbar } from '../ColorPickerToolbar';
import { GridToolbar } from '../GridToolbar';
import { useMeasureStore } from '../store';
import { useAnnotationStore } from '../../annotate/state/store';

function makePatch(centerHex = '#EF4444'): string[][] {
  return Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 7 }, (__, c) => (r === 3 && c === 3 ? centerHex : '#1E293B'))
  );
}

describe('ColorPickerToolbar & GridToolbar (T032, T034, T035)', () => {
  let overlay: HTMLDivElement;

  beforeEach(() => {
    overlay = document.createElement('div');
    overlay.id = 'annotation-ui-overlay';
    Object.defineProperty(overlay, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(overlay, 'clientHeight', { value: 300, configurable: true });
    document.body.appendChild(overlay);

    useMeasureStore.setState({
      activeUtility: null,
      gridVisible: false,
      gridSpacing: 50,
      gridOpacity: 0.2,
      currentSample: null,
      colorPickerFrozen: false,
    });
    useAnnotationStore.setState({ selectedIds: [] });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    overlay.remove();
  });

  it('ColorPickerToolbar renders 7x7 pixel loupe, clamps near viewport edges, and handles clipboard rejection safely', () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard blocked'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const sample = {
      x: 10,
      y: 15,
      hex: '#EF4444',
      rgb: [239, 68, 68] as [number, number, number],
      patch: makePatch('#EF4444'),
    };

    render(
      React.createElement(ColorPickerToolbar, {
        sample,
        anchor: { x: 10, y: 15 },
        frozen: true,
      })
    );

    const loupeCells = overlay.querySelectorAll('.xs-color-loupe-cell');
    expect(loupeCells).toHaveLength(49);

    const toolbar = overlay.querySelector('.xs-color-picker-toolbar') as HTMLDivElement;
    // Near top-left corner (10, 15): left clamps away from 0, top flips below cursor (> 15)
    expect(parseFloat(toolbar.style.left)).toBeGreaterThanOrEqual(110);
    expect(parseFloat(toolbar.style.top)).toBeGreaterThan(15);

    fireEvent.click(screen.getByRole('button', { name: 'Copy HEX' }));
    expect(writeText).toHaveBeenCalledWith('#EF4444');
  });

  it('GridToolbar updates gridSpacing presets (16/32/50/100), opacity slider, and hides grid cleanly', () => {
    useMeasureStore.setState({ gridVisible: true, gridSpacing: 50, gridOpacity: 0.2 });

    render(React.createElement(GridToolbar));

    for (const spacing of [16, 32, 50, 100]) {
      fireEvent.click(screen.getByRole('button', { name: `Grid ${spacing}px` }));
      expect(useMeasureStore.getState().gridSpacing).toBe(spacing);
    }

    fireEvent.click(screen.getByRole('button', { name: 'Grid Opacity' }));
    const slider = overlay.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '45' } });
    expect(useMeasureStore.getState().gridOpacity).toBeCloseTo(0.45, 5);

    fireEvent.click(screen.getByRole('button', { name: 'Hide Grid' }));
    expect(useMeasureStore.getState().gridVisible).toBe(false);
  });
});
