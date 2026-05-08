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
