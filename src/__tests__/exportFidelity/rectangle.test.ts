/**
 * rectangle.test.ts — Export fidelity matrix for the `rectangle` annotation type.
 * Tolerance: PNG 0.3%, JPEG 1.5%, outsideObjectMaxPixels 10.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { RectangleObject } from '../../annotate/state/types';

const RECT_OBJ: RectangleObject = {
  id: 'test-rect',
  type: 'rectangle',
  x: 150,
  y: 100,
  rotation: 0,
  draggable: false,
  width: 300,
  height: 200,
  stroke: '#3b82f6',
  strokeWidth: 3,
  lineStyle: 'solid',
  cornerRadius: 8,
};

const TOLERANCE_PNG = { totalDiffPercent: 0.3, outsideObjectMaxPixels: 10 };
const TOLERANCE_JPEG = { totalDiffPercent: 1.5, outsideObjectMaxPixels: 10 };
const OBJECT_BOUNDS = { x: 146, y: 96, w: 308, h: 208 };

describe('export fidelity — rectangle', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} · PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [RECT_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `rectangle/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} · JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [RECT_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `rectangle/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
