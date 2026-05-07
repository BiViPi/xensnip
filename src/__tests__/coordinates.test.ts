import { describe, it, expect } from 'vitest';
import { getCompositionCoordinates } from '../measure/coordinates';

describe('getCompositionCoordinates', () => {
  it('returns input coordinates unchanged at scale 1.0 (within bounds)', () => {
    const result = getCompositionCoordinates(100, 200, 1920, 1080);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('clamps to zero for negative inputs', () => {
    const result = getCompositionCoordinates(-10, -5, 1920, 1080);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('clamps to canvas max for out-of-bounds inputs', () => {
    const result = getCompositionCoordinates(2000, 2000, 1920, 1080);
    expect(result).toEqual({ x: 1919, y: 1079 });
  });

  it('floors fractional coordinates', () => {
    const result = getCompositionCoordinates(100.9, 200.7, 1920, 1080);
    expect(result).toEqual({ x: 100, y: 200 });
  });
});
