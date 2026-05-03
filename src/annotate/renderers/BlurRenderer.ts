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

  // 1. Create a temporary canvas for the region
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  // 2. Draw the region from sourceCanvas to tempCanvas
  tempCtx.drawImage(
    sourceCanvas,
    x, y, width, height, // source rect
    0, 0, width, height  // destination rect
  );

  // 3. Apply blur filter to tempCtx
  // Note: ctx.filter is supported in modern browsers
  ctx.save();
  ctx.filter = `blur(${blurRadius}px)`;
  
  // 4. Draw the blurred tempCanvas back to main ctx
  // We draw it back at (x, y)
  ctx.drawImage(tempCanvas, x, y);
  ctx.restore();
}
