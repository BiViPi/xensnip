import { OpaqueRedactObject } from "../state/types";

export function renderOpaqueRedact(ctx: CanvasRenderingContext2D, obj: OpaqueRedactObject) {
  ctx.save();
  
  // Apply rotation if any
  if (obj.rotation !== 0) {
    ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
    ctx.rotate((obj.rotation * Math.PI) / 180);
    ctx.translate(-(obj.x + obj.width / 2), -(obj.y + obj.height / 2));
  }
  
  // Draw fill
  ctx.fillStyle = obj.fill;
  ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  
  // Draw border if width > 0
  if (obj.borderWidth > 0) {
    ctx.strokeStyle = obj.borderColor;
    ctx.lineWidth = obj.borderWidth;
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
  }
  
  ctx.restore();
}
