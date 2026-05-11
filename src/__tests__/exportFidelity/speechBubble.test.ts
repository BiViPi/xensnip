/**
 * speechBubble.test.ts - Export fidelity matrix for the `speech_bubble` annotation type.
 * Tolerance: PNG 0.8%, JPEG 2.0%, outsideObjectMaxPixels 40.
 */
import { describe, it, expect } from 'vitest';
import { composeWithAnnotations } from '../../compose/composeWithAnnotations';
import { createTestImageElement, assertExportFidelity } from '../utils/exportFidelity';
import { VARIANTS, VARIANT_NAMES } from '../utils/testPresets';
import type { SpeechBubbleObject } from '../../annotate/state/types';

const SPEECH_OBJ: SpeechBubbleObject = {
  id: 'test-bubble',
  type: 'speech_bubble',
  x: 100,
  y: 100,
  rotation: 0,
  draggable: false,
  width: 300,
  height: 150,
  text: 'Hello XenSnip!',
  fontSize: 24,
  fontFamily: 'sans-serif',
  fill: '#3b82f6',
  textColor: '#ffffff',
  stroke: '#1e40af',
  padding: 10,
  cornerRadius: 12,
  tailX: 150,
  tailY: 190,
};

const TOLERANCE_PNG = { totalDiffPercent: 0.8, outsideObjectMaxPixels: 40 };
const TOLERANCE_JPEG = { totalDiffPercent: 2.0, outsideObjectMaxPixels: 40 };
const OBJECT_BOUNDS = { x: 95, y: 95, w: 310, h: 200 };

describe('export fidelity - speech_bubble', () => {
  VARIANTS.forEach((preset, vi) => {
    const vName = VARIANT_NAMES[vi];

    it(`${vName} - PNG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [SPEECH_OBJ], 'image/png', 1.0);
      const result = await assertExportFidelity(bytes, {
        baselineName: `speech_bubble/${vName}-f1.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_PNG,
        format: 'png',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });

    it(`${vName} - JPEG`, async () => {
      const img = await createTestImageElement();
      const bytes = await composeWithAnnotations(img, preset, [SPEECH_OBJ], 'image/jpeg', 0.9);
      const result = await assertExportFidelity(bytes, {
        baselineName: `speech_bubble/${vName}-f2.png`,
        objectBounds: OBJECT_BOUNDS,
        tolerance: TOLERANCE_JPEG,
        format: 'jpeg',
      });
      expect(result.pass, `totalDiff=${result.totalDiffPercent.toFixed(2)}% outside=${result.outsideObjectDiffPixels}px diffPath=${result.diffPath}`).toBe(true);
    });
  });
});
