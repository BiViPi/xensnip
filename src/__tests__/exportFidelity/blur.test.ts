/**
 * blur.test.ts — Export fidelity matrix for the `blur` annotation type.
 * Tolerance: PNG 1.0%, JPEG 2.0%, outsideObjectMaxPixels 50.
 * Blur is the highest-tolerance type because CSS filter blur has a large
 * bleed halo that naturally overlaps outside the object bounds.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { BlurObject } from '../../annotate/state/types';

const BLUR_OBJ: BlurObject = {
  id: 'test-blur',
  type: 'blur',
  x: 200,
  y: 150,
  rotation: 0,
  draggable: false,
  width: 200,
  height: 150,
  blurRadius: 12,
};

const TOLERANCE_PNG = { totalDiffPercent: 1.0, outsideObjectMaxPixels: 50 };
const TOLERANCE_JPEG = { totalDiffPercent: 2.0, outsideObjectMaxPixels: 50 };
const OBJECT_BOUNDS = { x: 190, y: 140, w: 220, h: 170 };

describe('export fidelity — blur', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} · PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [BLUR_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `blur/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} · JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [BLUR_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `blur/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
