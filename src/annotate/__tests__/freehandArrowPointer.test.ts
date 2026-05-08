import { describe, it, expect } from 'vitest';
import {
  computeFreehandPathLength,
  shouldAddFreehandPoint,
  FREEHAND_MIN_PATH_LENGTH,
  FREEHAND_POINT_DISTANCE_SQ,
} from '../pointer/freehandArrowPointer';

describe('computeFreehandPathLength', () => {
  it('returns 0 for an empty or single-point path', () => {
    expect(computeFreehandPathLength([])).toBe(0);
    expect(computeFreehandPathLength([0, 0])).toBe(0);
  });

  it('computes length of a horizontal line', () => {
    // points: [0,0, 10,0] — one segment of length 10
    expect(computeFreehandPathLength([0, 0, 10, 0])).toBeCloseTo(10);
  });

  it('sums multiple segments', () => {
    // [0,0, 3,4, 6,8] — two segments of length 5 each → total 10
    expect(computeFreehandPathLength([0, 0, 3, 4, 6, 8])).toBeCloseTo(10);
  });

  it('threshold constant is 20', () => {
    expect(FREEHAND_MIN_PATH_LENGTH).toBe(20);
  });
});

describe('shouldAddFreehandPoint', () => {
  it('returns true when new point is far enough from the last point', () => {
    // last point at (0,0), new relative at (5,0): distance² = 25 > 16
    expect(shouldAddFreehandPoint([0, 0], 5, 0)).toBe(true);
  });

  it('returns false when new point is too close to the last point', () => {
    // last point at (0,0), new relative at (2,2): distance² = 8 < 16 (actually (2-0)²+(2-0)²=8)
    expect(shouldAddFreehandPoint([0, 0], 2, 2)).toBe(false);
  });

  it('returns false exactly at the threshold boundary (distance² = 16)', () => {
    // last at (0,0), new at (4,0): distance² = 16 → NOT > 16
    expect(shouldAddFreehandPoint([0, 0], 4, 0)).toBe(false);
  });

  it('uses the last two values in the points array', () => {
    // points has multiple entries; last is (10,10)
    expect(shouldAddFreehandPoint([0, 0, 5, 5, 10, 10], 15, 10)).toBe(true);
    // last is (10,10), new is (11,11): distance² = 2 < 16
    expect(shouldAddFreehandPoint([0, 0, 5, 5, 10, 10], 11, 11)).toBe(false);
  });

  it('FREEHAND_POINT_DISTANCE_SQ constant is 16', () => {
    expect(FREEHAND_POINT_DISTANCE_SQ).toBe(16);
  });
});
