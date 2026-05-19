import { describe, it, expect } from 'vitest';
import { getFrameRenderer } from '@studio-impl/frames';

const geometryParams = { width: 1.6, height: 0.9, cornerRadius: 0.1, depth: 0.05, bevel: 0.01 };

describe('getFrameRenderer', () => {
  it('returns a browser frame renderer with title-bar support', () => {
    expect(getFrameRenderer('browser').hasTitleBar).toBe(true);
  });

  it('returns an acrylic frame renderer without title-bar support', () => {
    expect(getFrameRenderer('acrylic').hasTitleBar).toBe(false);
  });

  it('reports browser frame depth directly from geometry params', () => {
    const renderer = getFrameRenderer('browser');

    expect(renderer.getActualDepth(geometryParams)).toBe(0.05);
  });

  it('reports acrylic frame depth from its thicker procedural shell', () => {
    const renderer = getFrameRenderer('acrylic');

    expect(renderer.getActualDepth(geometryParams)).toBe(0.125);
  });

  it('verifies browser getContentLayout matches old screen geometry formula', () => {
    const renderer = getFrameRenderer('browser');
    const layout = renderer.getContentLayout(geometryParams);

    // width: 1.6 - 0.01 * 1.6 = 1.584
    expect(layout.width).toBeCloseTo(1.584);
    // height: 0.9 - 0.01 * 1.6 = 0.884
    expect(layout.height).toBeCloseTo(0.884);
    // radius: Math.max(0, 0.1 - 0.01 * 0.8) = 0.092
    expect(layout.radius).toBeCloseTo(0.092);
    // z: 0.05 / 2 - 0.004 = 0.021
    expect(layout.z).toBeCloseTo(0.021);
    // backZ: 0.05 / 2 - 0.01 = 0.015
    expect(layout.backZ).toBeCloseTo(0.015);
  });

  it('verifies acrylic getContentLayout returns a solid glass inset structure', () => {
    const renderer = getFrameRenderer('acrylic');
    const layout = renderer.getContentLayout(geometryParams);

    // inset = Math.max(0.08, 0.01 * 2) = 0.08
    // width: 1.6 - 0.16 = 1.44
    expect(layout.width).toBeCloseTo(1.44);
    // height: 0.9 - 0.16 = 0.74
    expect(layout.height).toBeCloseTo(0.74);
    // radius: Math.max(0.008, 0.1 - 0.08) = 0.02
    expect(layout.radius).toBeCloseTo(0.02);
    // z: 0.0
    expect(layout.z).toBeCloseTo(0.0);
    // backZ: -0.002
    expect(layout.backZ).toBeCloseTo(-0.002);
  });
});
