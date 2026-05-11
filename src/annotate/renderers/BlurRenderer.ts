import { BlurObject } from '../state/types';

/**
 * Real blur implementation that samples from a source canvas (the screenshot),
 * blurs the region, and draws it back into the target context.
 */
export function renderBlur(
  ctx: CanvasRenderingContext2D,
  obj: BlurObject,
  sourceCanvas: HTMLCanvasElement
) {
  const { x, y, width, height, blurRadius } = obj;
  if (width <= 0 || height <= 0) return;

  // 1. Calculate expansion to allow blur to bleed in from edges
  const margin = blurRadius * 2;
  const sx = Math.max(0, x - margin);
  const sy = Math.max(0, y - margin);
  const sw = Math.min(sourceCanvas.width - sx, width + margin * 2);
  const sh = Math.min(sourceCanvas.height - sy, height + margin * 2);

  // 2. Create a temporary canvas for the expanded region
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  // 3. Draw the expanded region from sourceCanvas to tempCanvas
  tempCtx.drawImage(
    sourceCanvas,
    sx, sy, sw, sh, // source rect (expanded)
    0, 0, sw, sh  // destination rect
  );

  // 4. Apply blur filter and draw back, clipped to original bounds
  ctx.save();
  
  // Create clipping region to ensure we only affect the intended (x, y, w, h)
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  // WYSIWYG Adjustment: Native ctx.filter blur is visually much stronger than 
  // Konva's blur filter for the same radius value. A factor of 0.5 matches
  // the editor preview's intensity.
  const visualBlurRadius = blurRadius * 0.5;
  ctx.filter = `blur(${visualBlurRadius}px)`;
  
  // Draw the blurred tempCanvas back at its expanded position
  // The filter will now have content outside the clip area to sample from,
  // making the edges look natural.
  ctx.drawImage(tempCanvas, sx, sy);
  ctx.restore();
}
