export const FREEHAND_MIN_PATH_LENGTH = 20;
export const FREEHAND_POINT_DISTANCE_SQ = 16;

export function computeFreehandPathLength(points: number[]): number {
  let total = 0;
  for (let i = 2; i < points.length; i += 2) {
    const dx = points[i] - points[i - 2];
    const dy = points[i + 1] - points[i - 1];
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

export function shouldAddFreehandPoint(
  points: number[],
  dx: number,
  dy: number
): boolean {
  const lastX = points[points.length - 2];
  const lastY = points[points.length - 1];
  return (dx - lastX) ** 2 + (dy - lastY) ** 2 > FREEHAND_POINT_DISTANCE_SQ;
}

/**
 * Collapses terminal micro-segments shorter than `minChord` at the end of a freehand stroke
 * so brief pointer-up release jitter does not flick the arrowhead direction sideways.
 */
export function stabilizeFreehandTail(points: number[], minChord = 14): number[] {
  if (points.length < 6) {
    return [...points];
  }

  const endX = points[points.length - 2];
  const endY = points[points.length - 1];

  let keepPairCount = Math.floor(points.length / 2) - 1;
  while (keepPairCount > 1) {
    const anchorX = points[(keepPairCount - 1) * 2];
    const anchorY = points[(keepPairCount - 1) * 2 + 1];
    const chord = Math.hypot(endX - anchorX, endY - anchorY);
    if (chord >= minChord) {
      break;
    }
    keepPairCount--;
  }

  const out: number[] = [];
  for (let i = 0; i < keepPairCount * 2; i++) {
    out.push(points[i]);
  }
  out.push(endX, endY);
  return out;
}
