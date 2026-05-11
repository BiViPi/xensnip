/**
 * arrow.test.ts — Export fidelity matrix for the `arrow` annotation type.
 * 7 Tier-1 types × 4 composition variants × 2 formats = 8 rows per type.
 *
 * Tolerance: PNG 0.3%, JPEG 1.5%, outsideObjectMaxPixels 20.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { ArrowObject } from '../../annotate/state/types';

const ARROW_OBJ: ArrowObject = {
  id: 'test-arrow',
  type: 'arrow',
  x: 0,
  y: 0,
  rotation: 0,
  draggable: false,
  points: [100, 150, 400, 300],
  stroke: '#ef4444',
  strokeWidth: 4,
  pointerLength: 12,
  pointerWidth: 12,
  style: 'solid',
};

const TOLERANCE_PNG = { totalDiffPercent: 0.3, outsideObjectMaxPixels: 20 };
const TOLERANCE_JPEG = { totalDiffPercent: 1.5, outsideObjectMaxPixels: 20 };
const OBJECT_BOUNDS = { x: 95, y: 145, w: 315, h: 165 };

describe('export fidelity — arrow', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} · PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [ARROW_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `arrow/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} · JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [ARROW_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `arrow/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
