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
});
