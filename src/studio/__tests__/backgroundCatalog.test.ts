import { describe, expect, it } from 'vitest';
import { getBackground, STUDIO_BACKGROUNDS } from '../stubs/backgrounds';

describe('studio background catalog', () => {
  it('contains the two initial WS3 backgrounds with complete lighting metadata', () => {
    expect(STUDIO_BACKGROUNDS).toHaveLength(2);

    for (const id of ['desk-light', 'tech-dark'] as const) {
      const background = getBackground(id);
      expect(background.id).toBe(id);
      expect(background.label.length).toBeGreaterThan(0);
      expect(background.imageSrc).toContain('.webp');
      expect(background.light.position).toHaveLength(3);
      expect(background.light.intensity).toBeGreaterThan(0);
      expect(background.shadow.intensity).toBeGreaterThan(0);
      expect(Number.isFinite(background.shadow.angle)).toBe(true);
    }
  });

  it('rejects unknown background ids', () => {
    expect(() => getBackground('missing')).toThrow('Unknown studio background');
  });
});
