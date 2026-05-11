/**
 * text.test.ts — Export fidelity matrix for the `text` annotation type.
 * Tolerance: PNG 0.8%, JPEG 2.0%, outsideObjectMaxPixels 30.
 * Text rendering variance (font substitution, sub-pixel hinting) is the
 * reason this type carries a wider tolerance than geometric types.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { TextObject } from '../../annotate/state/types';

const TEXT_OBJ: TextObject = {
  id: 'test-text',
  type: 'text',
  x: 120,
  y: 200,
  rotation: 0,
  draggable: false,
  text: 'Hello World',
  fontSize: 28,
  fontFamily: 'sans-serif',
  fill: '#ffffff',
  fontStyle: 'bold',
  align: 'left',
  padding: 4,
};

const TOLERANCE_PNG = { totalDiffPercent: 0.8, outsideObjectMaxPixels: 30 };
const TOLERANCE_JPEG = { totalDiffPercent: 2.0, outsideObjectMaxPixels: 30 };
const OBJECT_BOUNDS = { x: 114, y: 194, w: 220, h: 44 };

describe('export fidelity — text', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} · PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [TEXT_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `text/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} · JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [TEXT_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `text/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
