/**
 * numbered.test.ts — Export fidelity matrix for the `numbered` annotation type.
 * Tolerance: PNG 0.5%, JPEG 1.5%, outsideObjectMaxPixels 20.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { NumberedObject } from '../../annotate/state/types';

const NUMBERED_OBJ: NumberedObject = {
  id: 'test-numbered',
  type: 'numbered',
  x: 300,
  y: 250,
  rotation: 0,
  draggable: false,
  displayNumber: 1,
  radius: 20,
  fill: '#3b82f6',
};

const TOLERANCE_PNG = { totalDiffPercent: 0.5, outsideObjectMaxPixels: 20 };
const TOLERANCE_JPEG = { totalDiffPercent: 1.5, outsideObjectMaxPixels: 20 };
const OBJECT_BOUNDS = { x: 276, y: 226, w: 48, h: 48 };

describe('export fidelity — numbered', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} · PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [NUMBERED_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `numbered/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} · JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [NUMBERED_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `numbered/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
