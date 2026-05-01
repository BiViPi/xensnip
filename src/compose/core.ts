import { EditorPreset, RatioOption } from "./preset";

export interface CompositionDimensions {
  canvasW: number;
  canvasH: number;
  drawX: number;
  drawY: number;
}

export function getCompositionDimensions(
  imageW: number,
  imageH: number,
  preset: EditorPreset
): CompositionDimensions {
  const { padding, ratio } = preset;
  
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
  
  const [targetRatioW, targetRatioH] = parseRatio(ratio);
  const targetRatio = targetRatioW / targetRatioH;
  const currentRatio = paddedW / paddedH;
  
  let canvasW: number;
  let canvasH: number;
  
  if (currentRatio > targetRatio) {
    canvasW = paddedW;
    canvasH = paddedW / targetRatio;
  } else {
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
    default: return [1, 1];
  }
}

export function drawComposition(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  preset: EditorPreset,
  canvasW: number,
  canvasH: number
): void {
  // 1. Background Rendering Logic
  const { bg_mode, bg_value, bg_colors, bg_gradient_type, bg_angle, bg_radius } = preset;

  if (bg_mode === "Solid") {
    ctx.fillStyle = bg_value || "#000000";
    ctx.fillRect(0, 0, canvasW, canvasH);
  } 
  else if (bg_mode === "Gradient") {
    let gradient: CanvasGradient;
    
    if (bg_gradient_type === "Linear") {
      // Calculate angle coordinates
      const angleRad = (bg_angle - 90) * (Math.PI / 180);
      const length = Math.sqrt(canvasW ** 2 + canvasH ** 2);
      const x0 = canvasW / 2 - (Math.cos(angleRad) * length) / 2;
      const y0 = canvasH / 2 - (Math.sin(angleRad) * length) / 2;
      const x1 = canvasW / 2 + (Math.cos(angleRad) * length) / 2;
      const y1 = canvasH / 2 + (Math.sin(angleRad) * length) / 2;
      
      gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    } else {
      // Radial Gradient
      const cx = canvasW / 2;
      const cy = canvasH / 2;
      const r = (bg_radius / 100) * Math.max(canvasW, canvasH);
      gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    }

    const stops = bg_colors.length > 0 ? bg_colors : ["#3b82f6", "#1d4ed8"];
    stops.forEach((color, i) => {
      gradient.addColorStop(i / (stops.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  else if (bg_mode === "Wallpaper") {
    // Premium Mesh-like rendering using multiple radial gradients for a "Windows 11" feel
    const stops = bg_colors.length > 0 ? bg_colors : ["#3b82f6", "#1d4ed8"];
    
    // Base color
    ctx.fillStyle = stops[0];
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Overlay mesh spots
    const spots = [
      { x: 0, y: 0, r: 1.2, c: stops[1] || stops[0] },
      { x: 1, y: 1, r: 1.0, c: stops[0] },
      { x: 0.8, y: 0.2, r: 0.8, c: stops[1] || stops[0] }
    ];

    ctx.globalCompositeOperation = "screen";
    spots.forEach(spot => {
      const g = ctx.createRadialGradient(
        spot.x * canvasW, spot.y * canvasH, 0,
        spot.x * canvasW, spot.y * canvasH, spot.r * canvasW
      );
      g.addColorStop(0, spot.c);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvasW, canvasH);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  // 2. Main Image & Shadow Logic
  const { inset, radius, shadow } = preset;
  const dims = getCompositionDimensions(image.width, image.height, preset);
  
  const drawX = dims.drawX;
  const drawY = dims.drawY;
  const imgW = image.width;
  const imgH = image.height;

  if (shadow !== "None") {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    switch (shadow) {
      case "Small": ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; break;
      case "Medium": ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; break;
      case "Large": ctx.shadowBlur = 48; ctx.shadowOffsetY = 16; break;
    }
    
    ctx.fillStyle = "white";
    roundedRect(ctx, drawX + inset, drawY + inset, imgW - inset * 2, imgH - inset * 2, radius);
    ctx.fill();
    ctx.restore();
  }

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
