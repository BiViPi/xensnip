export interface RulerLabelLayout {
  label: string;
  distance: number;
  centerX: number;
  centerY: number;
  displayAngleDeg: number;
  displayAngleRad: number;
  pillWidth: number;
  pillHeight: number;
  pillOffsetY: number;
  pillRadius: number;
}

export function getRulerLabelLayout(
  points: [number, number, number, number],
  measuredTextWidth?: number,
  scale = 1
): RulerLabelLayout {
  const safeScale = scale > 0 ? scale : 1;
  const dx = points[2] - points[0];
  const dy = points[3] - points[1];
  const distance = Math.round(Math.hypot(dx, dy));
  const label = `${distance}px`;

  const centerX = (points[0] + points[2]) / 2;
  const centerY = (points[1] + points[3]) / 2;

  const rawAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const displayAngleDeg =
    rawAngleDeg > 90
      ? rawAngleDeg - 180
      : rawAngleDeg < -90
        ? rawAngleDeg + 180
        : rawAngleDeg;
  const displayAngleRad = (displayAngleDeg * Math.PI) / 180;

  const textWidth =
    measuredTextWidth && measuredTextWidth > 0 ? measuredTextWidth : label.length * 7.5;
  const pillWidth = Math.max(44, Math.ceil(textWidth) + 14) / safeScale;
  const pillHeight = 20 / safeScale;
  const pillOffsetY = -14 / safeScale;
  const pillRadius = 4 / safeScale;

  return {
    label,
    distance,
    centerX,
    centerY,
    displayAngleDeg,
    displayAngleRad,
    pillWidth,
    pillHeight,
    pillOffsetY,
    pillRadius,
  };
}

/**
 * Universal rounded-rectangle path helper compatible with both browser and headless node-canvas contexts.
 */
export function addRulerPillPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  if (r <= 0.01) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
