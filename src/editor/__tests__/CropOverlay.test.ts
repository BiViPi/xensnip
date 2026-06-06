import { describe, expect, it } from 'vitest';
import { resizeCropBounds } from '../CropOverlay';

describe('resizeCropBounds', () => {
  const resizeBounds = {
    minX: 80,
    minY: 40,
    maxX: 440,
    maxY: 260,
  };

  it('allows east handle to expand up to composition maxX', () => {
    const next = resizeCropBounds(
      { x: 120, y: 70, w: 200, h: 100 },
      'e',
      90,
      0,
      resizeBounds
    );

    expect(next).toEqual({ x: 120, y: 70, w: 290, h: 100 });
  });

  it('allows south handle to expand up to composition maxY', () => {
    const next = resizeCropBounds(
      { x: 120, y: 70, w: 200, h: 100 },
      's',
      0,
      60,
      resizeBounds
    );

    expect(next).toEqual({ x: 120, y: 70, w: 200, h: 160 });
  });

  it('clamps south-east corner within composition bounds', () => {
    const next = resizeCropBounds(
      { x: 120, y: 70, w: 260, h: 150 },
      'se',
      120,
      120,
      resizeBounds
    );

    expect(next).toEqual({ x: 120, y: 70, w: 320, h: 190 });
  });

  it('allows north-east corner to move within composition bounds', () => {
    const next = resizeCropBounds(
      { x: 120, y: 90, w: 200, h: 120 },
      'ne',
      80,
      -30,
      resizeBounds
    );

    expect(next).toEqual({ x: 120, y: 60, w: 280, h: 150 });
  });
});
