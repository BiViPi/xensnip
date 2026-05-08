export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normalizeRect(
  start: { x: number; y: number },
  end: { x: number; y: number }
): SelectionRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}
