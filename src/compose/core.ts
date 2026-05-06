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
  const borderTotal = preset.border_width * 2;

  const drawW = imageW;
  const drawH = imageH;

  const minCanvasW = imageW + padding * 2 + borderTotal;
  const minCanvasH = imageH + padding * 2 + borderTotal;

  let canvasW: number = minCanvasW;
  let canvasH: number = minCanvasH;

  if (ratio !== "Auto") {
    const [rw, rh] = parseRatio(ratio);
    const targetAspect = rw / rh;
    const currentAspect = minCanvasW / minCanvasH;

    if (currentAspect > targetAspect) {
      canvasW = minCanvasW;
      canvasH = minCanvasW / targetAspect;
    } else {
      canvasH = minCanvasH;
      canvasW = minCanvasH * targetAspect;
    }
  }

  const result = {
    canvasW: Math.round(canvasW),
    canvasH: Math.round(canvasH),
    drawX: Math.round((canvasW - drawW) / 2),
    drawY: Math.round((canvasH - drawH) / 2),
    drawW: Math.round(drawW),
    drawH: Math.round(drawH)
  };
  
  return result;
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

export function getOrLoadWallpaper(wpId: string): HTMLImageElement | null {
  return wallpaperCache[wpId] || null;
}

export async function preloadWallpaper(wpId: string): Promise<HTMLImageElement> {
  if (wallpaperCache[wpId]) return wallpaperCache[wpId];
  const url = WALLPAPER_MAP[wpId];
  if (!url) throw new Error(`Unknown wallpaper ID: ${wpId}`);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      wallpaperCache[wpId] = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load wallpaper: ${url}`));
    img.src = url;
  });
}

export function drawComposition(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  preset: EditorPreset,
  dims: CompositionDimensions
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const { canvasW, canvasH, drawX, drawY, drawW, drawH } = dims;
  const { 
    bg_mode, bg_value, bg_colors, bg_gradient_type, bg_angle, bg_radius, 
    radius, 
    shadow_enabled, shadow_blur, shadow_opacity, shadow_angle, shadow_offset 
  } = preset;

  ctx.clearRect(0, 0, canvasW, canvasH);

  // --- LAYER 1: BACKGROUND ---
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

  const framePadding = preset.border_width;
  const fx = drawX - framePadding;
  const fy = drawY - framePadding;
  const fw = drawW + framePadding * 2;
  const fh = drawH + framePadding * 2;
  const fr = radius + framePadding;

  // --- LAYER 2: SHADOW & GLASS BASE (BEHIND SCREENSHOT) ---
  if (shadow_enabled) {
    ctx.save();
    const angleRad = (shadow_angle - 90) * (Math.PI / 180);
    const shadowX = Math.cos(angleRad) * shadow_offset;
    const shadowY = Math.sin(angleRad) * shadow_offset;
    const offscreenOffset = 10000;
    ctx.shadowOffsetX = shadowX + offscreenOffset;
    ctx.shadowOffsetY = shadowY;
    ctx.shadowBlur = shadow_blur;
    ctx.shadowColor = `rgba(0, 0, 0, ${shadow_opacity})`;
    ctx.fillStyle = "black"; 
    roundedRect(ctx, fx - offscreenOffset, fy, fw, fh, fr);
    ctx.fill();
    ctx.restore();
  }

  // Draw the actual Glass Material behind the image
  if (framePadding > 0) {
    ctx.save();
    ctx.fillStyle = preset.border_color || "rgba(15, 23, 42, 0.8)"; 
    roundedRect(ctx, fx, fy, fw, fh, fr);
    ctx.fill();
    ctx.restore();
  }

  // --- LAYER 3: SCREENSHOT ---
  ctx.save();
  const finalX = Math.round(drawX);
  const finalY = Math.round(drawY);
  ctx.imageSmoothingEnabled = false;
  if (radius > 0) {
    roundedRect(ctx, finalX, finalY, drawW, drawH, radius);
    ctx.clip();
  }
  ctx.drawImage(image, finalX, finalY, drawW, drawH);
  ctx.restore();

  // --- LAYER 4: BORDER HIGHLIGHT (ON TOP) ---
  if (framePadding > 0) {
    ctx.save();
    // 1. Draw a very subtle inner highlight at the edge where image meets frame
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    roundedRect(ctx, finalX, finalY, drawW, drawH, radius);
    ctx.stroke();

    // 2. Draw the outer "Rim Light" highlight (The Premium Border)
    ctx.lineWidth = 1.5;
    const rimGrad = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
    rimGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
    rimGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.1)");
    rimGrad.addColorStop(1, "rgba(255, 255, 255, 0.3)");
    ctx.strokeStyle = rimGrad;
    roundedRect(ctx, fx + 0.75, fy + 0.75, fw - 1.5, fh - 1.5, fr);
    ctx.stroke();
    ctx.restore();
  }
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
