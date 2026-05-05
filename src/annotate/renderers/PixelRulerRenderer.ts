import { PixelRulerObject } from '../../annotate/state/types';

export function renderPixelRuler(ctx: CanvasRenderingContext2D, obj: PixelRulerObject) {
  const dx = obj.points[2] - obj.points[0];
  const dy = obj.points[3] - obj.points[1];
  const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
  
  ctx.save();
  ctx.translate(obj.x, obj.y);
  
  // Draw Line
  ctx.beginPath();
  ctx.moveTo(obj.points[0], obj.points[1]);
  ctx.lineTo(obj.points[2], obj.points[3]);
  ctx.strokeStyle = obj.stroke;
  ctx.lineWidth = obj.strokeWidth;
  ctx.stroke();

  // Draw Arrows (simplified for canvas)
  drawArrowHead(ctx, obj.points[2], obj.points[3], Math.atan2(dy, dx), obj.stroke);
  drawArrowHead(ctx, obj.points[0], obj.points[1], Math.atan2(-dy, -dx), obj.stroke);

  // Draw Label
  const centerX = (obj.points[0] + obj.points[2]) / 2;
  const centerY = (obj.points[1] + obj.points[3]) / 2;
  const label = `${distance}px`;
  
  ctx.font = '12px sans-serif';
  const metrics = ctx.measureText(label);
  const padding = 4;
  const rectW = metrics.width + padding * 2;
  const rectH = 16;

  ctx.translate(centerX, centerY);
  const angle = Math.atan2(dy, dx);
  ctx.rotate(angle);

  if (obj.showBackground) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.roundRect(-rectW / 2, -rectH - 4, rectW, rectH, 4);
    ctx.fill();
  }

  ctx.fillStyle = obj.labelFill;
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -rectH / 2 - 4);

  ctx.restore();
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
