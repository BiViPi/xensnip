import { describe, it, expect } from 'vitest';
import { normalizeRect } from '../pointer/selectionRect';

describe('normalizeRect', () => {
  it('produces positive width and height regardless of drag direction', () => {
    const result = normalizeRect({ x: 50, y: 50 }, { x: 10, y: 20 });
    expect(result).toEqual({ x: 10, y: 20, width: 40, height: 30 });
  });

  it('handles top-left to bottom-right drag', () => {
    const result = normalizeRect({ x: 10, y: 20 }, { x: 50, y: 80 });
    expect(result).toEqual({ x: 10, y: 20, width: 40, height: 60 });
  });

  it('handles bottom-right to top-left drag', () => {
    const result = normalizeRect({ x: 100, y: 200 }, { x: 30, y: 50 });
    expect(result).toEqual({ x: 30, y: 50, width: 70, height: 150 });
  });

  it('produces zero dimensions when start equals end', () => {
    const result = normalizeRect({ x: 25, y: 25 }, { x: 25, y: 25 });
    expect(result).toEqual({ x: 25, y: 25, width: 0, height: 0 });
  });
});
