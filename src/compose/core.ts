import { EditorPreset, BACKGROUND_CONFIGS, RatioOption } from "./preset";

export interface CompositionDimensions {
  canvasW: number;
  canvasH: number;
  drawX: number;
  drawY: number;
}

/**
 * Shared dimension math for both preview and export.
 * Computes canvas size and centering offsets based on ratio and padding.
 */
export function getCompositionDimensions(
  imageW: number,
  imageH: number,
  preset: EditorPreset
): CompositionDimensions {
  const { padding, ratio } = preset;
  
  // 1. Initial size with padding
  const paddedW = imageW + padding * 2;
  const paddedH = imageH + padding * 2;
  
  if (ratio === "Free") {
    return {
      canvasW: paddedW,
      canvasH: paddedH,
      drawX: padding,
      drawY: padding
    };
  }
  
  // 2. Fixed ratio sizing
  const [targetRatioW, targetRatioH] = parseRatio(ratio);
  const targetRatio = targetRatioW / targetRatioH;
  const currentRatio = paddedW / paddedH;
  
  let canvasW: number;
  let canvasH: number;
  
  if (currentRatio > targetRatio) {
    // Current is wider than target, height must grow
    canvasW = paddedW;
    canvasH = paddedW / targetRatio;
  } else {
    // Current is taller than target, width must grow
    canvasH = paddedH;
    canvasW = paddedH * targetRatio;
  }
  
  return {
    canvasW,
    canvasH,
    drawX: (canvasW - imageW) / 2,
    drawY: (canvasH - imageH) / 2
  };
}

function parseRatio(ratio: RatioOption): [number, number] {
  switch (ratio) {
    case "16:9": return [16, 9];
    case "4:3": return [4, 3];
    case "1:1": return [1, 1];
    case "3:4": return [3, 4];
    case "9:16": return [9, 16];
    default: return [1, 1]; // Fallback
  }
}

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
  const { inset, radius, shadow } = preset;
  const dims = getCompositionDimensions(image.width, image.height, preset);
  
  const drawX = dims.drawX;
  const drawY = dims.drawY;
  const imgW = image.width;
  const imgH = image.height;

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
    
    ctx.fillStyle = "white";
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
