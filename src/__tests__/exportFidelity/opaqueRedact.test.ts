/**
 * opaqueRedact.test.ts — Export fidelity matrix for the `opaque_redact` annotation type.
 * Tolerance: PNG 0.1%, JPEG 1.0%, outsideObjectMaxPixels 5.
 * opaque_redact is a solid fill — tightest tolerance of all Tier 1 types.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { OpaqueRedactObject } from '../../annotate/state/types';

const REDACT_OBJ: OpaqueRedactObject = {
  id: 'test-redact',
  type: 'opaque_redact',
  x: 200,
  y: 180,
  rotation: 0,
  draggable: false,
  width: 250,
  height: 60,
  fill: '#0f172a',
  borderColor: '#334155',
  borderWidth: 2,
};

const TOLERANCE_PNG = { totalDiffPercent: 0.1, outsideObjectMaxPixels: 5 };
const TOLERANCE_JPEG = { totalDiffPercent: 1.0, outsideObjectMaxPixels: 5 };
const OBJECT_BOUNDS = { x: 196, y: 176, w: 258, h: 68 };

describe('export fidelity — opaque_redact', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} · PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [REDACT_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `opaque-redact/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} · JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [REDACT_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `opaque-redact/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
