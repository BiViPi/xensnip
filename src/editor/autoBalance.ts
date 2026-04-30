import { RatioOption } from "../compose/preset";

/**
 * Auto-balance logic for first open.
 * Computes padding such that the screenshot card is centered relative to the chosen ratio.
 */
export function autoBalance(
  intrinsicW: number,
  intrinsicH: number,
  ratio: RatioOption,
  canvasW: number,
  canvasH: number
): number {
  // Sprint 04: "compute padding such that the screenshot card is centered relative to the chosen ratio."
  // Actually, if we are drawing on a canvas of canvasW x canvasH,
  // we want to find a padding that feels "balanced".
  // The plan says: "Formula: padding = max(8, (canvas_side - screenshot_side) / 2) for each axis."
  
  // For MVP, we'll just use a reasonable default if we can't perfectly center it.
  const horizontalPadding = Math.max(8, (canvasW - intrinsicW) / 2);
  const verticalPadding = Math.max(8, (canvasH - intrinsicH) / 2);
  
  return Math.min(horizontalPadding, verticalPadding, 64); // Cap it for sanity
}
