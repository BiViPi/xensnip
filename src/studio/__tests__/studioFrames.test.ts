import { describe, it, expect } from 'vitest';
import { getFrameRenderer } from '@studio-impl/frames';

describe('getFrameRenderer', () => {
  it('returns a browser frame renderer with title-bar support', () => {
    expect(getFrameRenderer('browser').hasTitleBar).toBe(true);
  });

  it('returns an acrylic frame renderer without title-bar support', () => {
    expect(getFrameRenderer('acrylic').hasTitleBar).toBe(false);
  });
});
