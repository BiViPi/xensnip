import { EditorPreset, RatioOption, WALLPAPER_MAP } from "./preset";

export interface CompositionDimensions {
  canvasW: number;
  canvasH: number;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
}

const wallpaperCache: Record<string, HTMLImageElement> = {};

export function getCompositionDimensions(
  imageW: number,
  imageH: number,
  preset: EditorPreset
): CompositionDimensions {
  const { padding, ratio } = preset;
  
  const requiredW = imageW + padding * 2;
  const requiredH = imageH + padding * 2;

  let canvasW: number;
  let canvasH: number;

  if (ratio === "Auto") {
    canvasW = requiredW;
    canvasH = requiredH;
  } else {
    const [rw, rh] = parseRatio(ratio);
    const targetAspect = rw / rh;
    const currentAspect = requiredW / requiredH;

    if (currentAspect > targetAspect) {
      canvasW = requiredW;
      canvasH = requiredW / targetAspect;
    } else {
      canvasH = requiredH;
      canvasW = requiredH * targetAspect;
    }
  }

  // Final scale to fit image into canvas minus padding
  const safeW = canvasW - padding * 2;
  const safeH = canvasH - padding * 2;
  const scale = Math.min(safeW / imageW, safeH / imageH);
  
  const drawW = imageW * scale;
  const drawH = imageH * scale;

  return {
    canvasW: Math.round(canvasW),
    canvasH: Math.round(canvasH),
    drawX: Math.round((canvasW - drawW) / 2),
    drawY: Math.round((canvasH - drawH) / 2),
    drawW: Math.round(drawW),
    drawH: Math.round(drawH)
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

function getOrLoadWallpaper(wpId: string): HTMLImageElement | null {
  if (wallpaperCache[wpId]) return wallpaperCache[wpId];
  const url = WALLPAPER_MAP[wpId];
  if (!url) return null;
  const img = new Image();
  img.onload = () => { wallpaperCache[wpId] = img; };
  img.src = url;
  return null;
}

export function drawComposition(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  preset: EditorPreset,
  dims: CompositionDimensions
): void {
  // 0. RESET STATE
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const { canvasW, canvasH, drawX, drawY, drawW, drawH } = dims;
  const { 
    bg_mode, bg_value, bg_colors, bg_gradient_type, bg_angle, bg_radius, 
    inset, radius, 
    shadow_enabled, shadow_blur, shadow_opacity, shadow_angle, shadow_offset 
  } = preset;

  // Clear
  ctx.clearRect(0, 0, canvasW, canvasH);

  // 1. Background
  if (bg_mode === "Solid") {
    ctx.fillStyle = bg_value || "#000000";
    ctx.fillRect(0, 0, canvasW, canvasH);
  } 
  else if (bg_mode === "Gradient") {
    let gradient: CanvasGradient;
    if (bg_gradient_type === "Linear") {
      const angleRad = (bg_angle - 90) * (Math.PI / 180);
      const length = Math.sqrt(canvasW ** 2 + canvasH ** 2);
      const x0 = canvasW / 2 - (Math.cos(angleRad) * length) / 2;
      const y0 = canvasH / 2 - (Math.sin(angleRad) * length) / 2;
      const x1 = canvasW / 2 + (Math.cos(angleRad) * length) / 2;
      const y1 = canvasH / 2 + (Math.sin(angleRad) * length) / 2;
      gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    } else {
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
    const wpImg = getOrLoadWallpaper(bg_value);
    if (wpImg) {
      const iw = wpImg.width;
      const ih = wpImg.height;
      const r = Math.max(canvasW / iw, canvasH / ih);
      const nw = iw * r;
      const nh = ih * r;
      const nx = (canvasW - nw) / 2;
      const ny = (canvasH - nh) / 2;
      ctx.drawImage(wpImg, nx, ny, nw, nh);
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  // 2. Image Rendering
  const finalX = Math.round(drawX + inset);
  const finalY = Math.round(drawY + inset);
  const finalW = Math.round(drawW - inset * 2);
  const finalH = Math.round(drawH - inset * 2);

  if (shadow_enabled) {
    ctx.save();
    const angleRad = (shadow_angle - 90) * (Math.PI / 180);
    ctx.shadowOffsetX = Math.cos(angleRad) * shadow_offset;
    ctx.shadowOffsetY = Math.sin(angleRad) * shadow_offset;
    ctx.shadowBlur = shadow_blur;
    ctx.shadowColor = `rgba(0, 0, 0, ${shadow_opacity})`;
    
    ctx.fillStyle = "white";
    roundedRect(ctx, finalX, finalY, finalW, finalH, radius);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundedRect(ctx, finalX, finalY, finalW, finalH, radius);
  ctx.clip();
  ctx.drawImage(image, finalX, finalY, finalW, finalH);
  ctx.restore();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (w <= 0 || h <= 0) return;
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
