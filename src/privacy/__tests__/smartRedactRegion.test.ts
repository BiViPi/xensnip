import { describe, expect, it } from 'vitest';
import { DEFAULT_PRESET } from '../../compose/preset';
import { resolveSmartRedactRegion } from '../smartRedactRegion';

function createImage(width: number, height: number): HTMLImageElement {
  return { width, height } as HTMLImageElement;
}

const TEST_PRESET = {
  ...DEFAULT_PRESET,
  ratio: 'Auto' as const,
  padding: 20,
  border_width: 10,
};

describe('resolveSmartRedactRegion', () => {
  it('targets only the screenshot area for full-canvas Smart Redact', () => {
    const region = resolveSmartRedactRegion({
      canvasWidth: 920,
      canvasHeight: 520,
      scope: 'full_canvas',
      selectionRect: null,
      image: createImage(400, 200),
      preset: TEST_PRESET,
    });

    expect(region).toEqual({
      x: 60,
      y: 60,
      width: 800,
      height: 400,
    });
  });

  it('scales selection bounds into the rendered canvas pixel space', () => {
    const region = resolveSmartRedactRegion({
      canvasWidth: 920,
      canvasHeight: 520,
      scope: 'selection',
      selectionRect: { x: 40, y: 20, width: 120, height: 80 },
      image: createImage(400, 200),
      preset: TEST_PRESET,
    });

    expect(region).toEqual({
      x: 80,
      y: 40,
      width: 240,
      height: 160,
    });
  });
});
