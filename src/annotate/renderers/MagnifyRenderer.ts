import { MagnifyObject } from '../state/types';

type CanvasWithRoundRect = CanvasRenderingContext2D & {
  roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
};

function addMagnifyClipPath(ctx: CanvasRenderingContext2D, obj: MagnifyObject) {
  const ctxWithRoundRect = ctx as CanvasWithRoundRect;
  if (ctxWithRoundRect.roundRect) {
    ctxWithRoundRect.roundRect(obj.x, obj.y, obj.width, obj.height, obj.cornerRadius);
  } else {
    ctx.rect(obj.x, obj.y, obj.width, obj.height);
  }
}

export function renderMagnify(ctx: CanvasRenderingContext2D, obj: MagnifyObject, compositionCanvas: HTMLCanvasElement) {
  const src = compositionCanvas;
  
  ctx.save();
  
  ctx.beginPath();
  addMagnifyClipPath(ctx, obj);
  ctx.clip();
  
  const destW = obj.sourceWidth * obj.zoom;
  const destH = obj.sourceHeight * obj.zoom;
  const offsetX = (destW - obj.width) / 2;
  const offsetY = (destH - obj.height) / 2;
  
  ctx.drawImage(
    src,
    obj.sourceX, obj.sourceY, obj.sourceWidth, obj.sourceHeight,
    obj.x - offsetX, obj.y - offsetY, destW, destH
  );
  
  ctx.restore();
  
  ctx.save();
  ctx.beginPath();
  addMagnifyClipPath(ctx, obj);
  ctx.strokeStyle = `rgba(255, 255, 255, ${obj.borderOpacity})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.stroke();
  ctx.restore();
}
