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

  let canvasW: number;
  let canvasH: number;

  if (ratio === "Auto") {
    // Keep the composition canvas stable. Padding only changes how much
    // the screenshot shrinks inside the canvas, not the canvas bounds.
    canvasW = imageW;
    canvasH = imageH;
  } else {
    const [rw, rh] = parseRatio(ratio);
    const targetAspect = rw / rh;
    const currentAspect = imageW / imageH;

    if (currentAspect > targetAspect) {
      canvasW = imageW;
      canvasH = imageW / targetAspect;
    } else {
      canvasH = imageH;
      canvasW = imageH * targetAspect;
    }
  }

  // Padding now insets the screenshot inside a fixed canvas instead of
  // resizing the canvas itself.
  const safeW = Math.max(1, canvasW - padding * 2);
  const safeH = Math.max(1, canvasH - padding * 2);
  const scale = Math.min(safeW / imageW, safeH / imageH, 1);
  
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

export function getOrLoadWallpaper(wpId: string): HTMLImageElement | null {
  return wallpaperCache[wpId] || null;
}

/**
 * Preloads a wallpaper into the cache. 
 * Returns a promise that resolves when the image is ready.
 */
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
  // 0. RESET STATE
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const { canvasW, canvasH, drawX, drawY, drawW, drawH } = dims;
  const { 
    bg_mode, bg_value, bg_colors, bg_gradient_type, bg_angle, bg_radius, 
    radius, 
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
  const finalX = drawX;
  const finalY = drawY;
  const finalW = drawW;
  const finalH = drawH;

  // 3. 3D Glass Frame & Dynamic Lighting (The "Volumetric" effect)
  const framePadding = 12; // Thickness of the glass frame
  const fx = finalX - framePadding;
  const fy = finalY - framePadding;
  const fw = finalW + framePadding * 2;
  const fh = finalH + framePadding * 2;
  const fr = radius + framePadding;

  if (shadow_enabled) {
    ctx.save();
    const angleRad = (shadow_angle - 90) * (Math.PI / 180);
    ctx.shadowOffsetX = Math.cos(angleRad) * shadow_offset;
    ctx.shadowOffsetY = Math.sin(angleRad) * shadow_offset;
    ctx.shadowBlur = shadow_blur;
    ctx.shadowColor = `rgba(0, 0, 0, ${shadow_opacity})`;
    
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)"; // Dark glass material
    roundedRect(ctx, fx, fy, fw, fh, fr);
    ctx.fill();
    ctx.restore();

    // Draw the Frame Highlights (Multi-layered "Soft Bevel" Effect)
    ctx.save();
    const lightAngleRad = (shadow_angle + 180 - 90) * (Math.PI / 180);
    const lx0 = fx + fw / 2 + Math.cos(lightAngleRad) * (fw / 2);
    const ly0 = fy + fh / 2 + Math.sin(lightAngleRad) * (fh / 2);
    const lx1 = fx + fw / 2 - Math.cos(lightAngleRad) * (fw / 2);
    const ly1 = fy + fh / 2 - Math.sin(lightAngleRad) * (fh / 2);

    const frameGrad = ctx.createLinearGradient(lx0, ly0, lx1, ly1);
    frameGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    frameGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.1)");
    frameGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    roundedRect(ctx, fx, fy, fw, fh, fr);
    
    // Layer 1: Bloom (Soft glow spreading outwards)
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = 14; 
    ctx.stroke();

    // Layer 2: Medium Rim (The main body of light)
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Layer 3: Sharp Edge (Final crisp catch-light)
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.restore();
  } else {
    // Flat background mode
    ctx.save();
    ctx.fillStyle = "#1e293b"; // Solid dark color
    roundedRect(ctx, fx, fy, fw, fh, fr);
    ctx.fill();
    // Subtle solid border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Draw the Main Image with subtle inner separation
  ctx.save();
  // Small drop shadow inside the frame to lift the image
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  
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
