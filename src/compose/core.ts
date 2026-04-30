import { EditorPreset, BACKGROUND_CONFIGS } from "./preset";

export function drawComposition(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  preset: EditorPreset,
  canvasW: number,
  canvasH: number
): void {
  // 1. Background
  const config = BACKGROUND_CONFIGS[preset.background];
  if (Array.isArray(config)) {
    const gradient = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    config.forEach((color, i) => {
      gradient.addColorStop(i / (config.length - 1), color);
    });
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = config;
  }
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. Calculations
  const { padding, inset, radius, shadow } = preset;
  
  // Calculate content area (where the screenshot card goes)
  // In MVP, we assume image is centered in the canvas
  const imgW = image.width;
  const imgH = image.height;
  
  const drawX = (canvasW - imgW) / 2;
  const drawY = (canvasH - imgH) / 2;

  // 3. Shadow
  if (shadow !== "None") {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    switch (shadow) {
      case "Small":
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        break;
      case "Medium":
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        break;
      case "Large":
        ctx.shadowBlur = 48;
        ctx.shadowOffsetY = 16;
        break;
    }
    
    // Draw a shadow-only rect behind the image (since we clip the image next)
    ctx.fillStyle = "white"; // Hidden by the image
    roundedRect(ctx, drawX + inset, drawY + inset, imgW - inset * 2, imgH - inset * 2, radius);
    ctx.fill();
    ctx.restore();
  }

  // 4. Image with Radius Clipping + Inset
  ctx.save();
  roundedRect(ctx, drawX + inset, drawY + inset, imgW - inset * 2, imgH - inset * 2, radius);
  ctx.clip();
  ctx.drawImage(image, drawX + inset, drawY + inset, imgW - inset * 2, imgH - inset * 2);
  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (w < 0) w = 0;
  if (h < 0) h = 0;
  if (r > w / 2) r = w / 2;
  if (r > h / 2) r = h / 2;
  
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
