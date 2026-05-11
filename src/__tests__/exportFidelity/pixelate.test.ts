/**
 * pixelate.test.ts — Export fidelity matrix for the `pixelate` annotation type.
 * Tolerance: PNG 0.5%, JPEG 1.5%, outsideObjectMaxPixels 10.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { PixelateObject } from '../../annotate/state/types';

const PIXELATE_OBJ: PixelateObject = {
  id: 'test-pixelate',
  type: 'pixelate',
  x: 180,
  y: 130,
  rotation: 0,
  draggable: false,
  width: 220,
  height: 160,
  pixelSize: 12,
  borderColor: '#ffffff',
  borderWidth: 1,
};

const TOLERANCE_PNG = { totalDiffPercent: 0.5, outsideObjectMaxPixels: 10 };
const TOLERANCE_JPEG = { totalDiffPercent: 1.5, outsideObjectMaxPixels: 10 };
const OBJECT_BOUNDS = { x: 176, y: 126, w: 228, h: 168 };

describe('export fidelity — pixelate', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} · PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [PIXELATE_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `pixelate/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} · JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [PIXELATE_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `pixelate/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
