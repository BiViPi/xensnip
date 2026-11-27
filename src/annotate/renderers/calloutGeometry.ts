/**
 * Computes the perimeter intersection point on a Callout label box [0..width] x [0..height]
 * along the ray from box center toward `(relTargetX, relTargetY)`.
 */
export function getCalloutAttachmentPoint(
  width: number,
  height: number,
  relTargetX: number,
  relTargetY: number
): { x: number; y: number } {
  const cx = width / 2;
  const cy = height / 2;
  const dx = relTargetX - cx;
  const dy = relTargetY - cy;

  if (Math.abs(dx) <= cx && Math.abs(dy) <= cy) {
    return { x: cx, y: cy };
  }

  const tx = dx === 0 ? Infinity : cx / Math.abs(dx);
  const ty = dy === 0 ? Infinity : cy / Math.abs(dy);
  const t = Math.min(tx, ty);

  return {
    x: cx + dx * t,
    y: cy + dy * t,
  };
}
