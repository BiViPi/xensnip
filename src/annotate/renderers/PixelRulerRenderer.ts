import { PixelRulerObject } from '../../annotate/state/types';
import { addRulerPillPath, getRulerLabelLayout } from './pixelRulerLayout';

export function renderPixelRuler(ctx: CanvasRenderingContext2D, obj: PixelRulerObject) {
  const dx = obj.points[2] - obj.points[0];
  const dy = obj.points[3] - obj.points[1];

  ctx.save();
  try {
    ctx.translate(obj.x, obj.y);
    if (obj.rotation !== 0) {
      ctx.rotate((obj.rotation * Math.PI) / 180);
    }

    // Draw line shaft
    ctx.beginPath();
    ctx.moveTo(obj.points[0], obj.points[1]);
    ctx.lineTo(obj.points[2], obj.points[3]);
    ctx.strokeStyle = obj.stroke;
    ctx.lineWidth = obj.strokeWidth;
    ctx.stroke();

    // Draw both arrowheads
    const angleRad = Math.atan2(dy, dx);
    drawArrowHead(ctx, obj.points[2], obj.points[3], angleRad, obj.stroke);
    drawArrowHead(ctx, obj.points[0], obj.points[1], Math.atan2(-dy, -dx), obj.stroke);

    // Measure label & compute upright layout
    ctx.font = '12px sans-serif';
    const prelimLayout = getRulerLabelLayout(obj.points, undefined, 1);
    const metrics = ctx.measureText(prelimLayout.label);
    const layout = getRulerLabelLayout(obj.points, metrics.width, 1);

    ctx.translate(layout.centerX, layout.centerY);
    ctx.rotate(layout.displayAngleRad);

    if (obj.showBackground) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      addRulerPillPath(
        ctx,
        -layout.pillWidth / 2,
        layout.pillOffsetY - layout.pillHeight / 2,
        layout.pillWidth,
        layout.pillHeight,
        layout.pillRadius
      );
      ctx.fill();
    }

    ctx.fillStyle = obj.labelFill;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layout.label, 0, layout.pillOffsetY);
  } finally {
    ctx.restore();
  }
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
  const size = 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size / 2);
  ctx.lineTo(-size, size / 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
