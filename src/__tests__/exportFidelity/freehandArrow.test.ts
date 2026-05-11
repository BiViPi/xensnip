/**
 * freehandArrow.test.ts - Export fidelity matrix for the `freehand_arrow` annotation type.
 * Tolerance: PNG 0.8%, JPEG 2.0%, outsideObjectMaxPixels 40.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { FreehandArrowObject } from '../../annotate/state/types';

const FREEHAND_OBJ: FreehandArrowObject = {
  id: 'test-freehand',
  type: 'freehand_arrow',
  x: 50,
  y: 50,
  rotation: 0,
  draggable: false,
  points: [0, 0, 50, 30, 100, 70, 150, 50, 200, 100],
  stroke: '#ef4444',
  strokeWidth: 4,
  smoothing: 0.5,
  pointerLength: 15,
  pointerWidth: 15,
};

const TOLERANCE_PNG = { totalDiffPercent: 0.8, outsideObjectMaxPixels: 40 };
const TOLERANCE_JPEG = { totalDiffPercent: 2.0, outsideObjectMaxPixels: 40 };
const OBJECT_BOUNDS = { x: 40, y: 40, w: 230, h: 130 }; // Bounds of the path plus arrow head

describe('export fidelity - freehand_arrow', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} - PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [FREEHAND_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `freehand_arrow/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} - JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [FREEHAND_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `freehand_arrow/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
