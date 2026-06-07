import type { CanvasDocument, CanvasImageObject } from "../editor/canvasDocument";
import type { EditorPreset, RatioOption } from "./preset";
import { getOrLoadWallpaper } from "./core";

export interface CanvasDocumentDimensions {
  canvasW: number;
  canvasH: number;
  contentOffsetX: number;
  contentOffsetY: number;
  contentW: number;
  contentH: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
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

export function getCanvasDocumentBounds(canvas: CanvasDocument): Bounds {
  if (canvas.images.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return canvas.images.reduce(
    (acc, image) => ({
      minX: Math.min(acc.minX, image.x),
      minY: Math.min(acc.minY, image.y),
      maxX: Math.max(acc.maxX, image.x + image.width),
      maxY: Math.max(acc.maxY, image.y + image.height),
    }),
    {
      minX: canvas.images[0].x,
      minY: canvas.images[0].y,
      maxX: canvas.images[0].x + canvas.images[0].width,
      maxY: canvas.images[0].y + canvas.images[0].height,
    }
  );
}

export function getCanvasDocumentDimensions(
  canvas: CanvasDocument,
  preset: EditorPreset
): CanvasDocumentDimensions {
  const bounds = getCanvasDocumentBounds(canvas);
  const borderTotal = preset.border_width * 2;
  const minCanvasW = Math.max(1, Math.round(bounds.maxX - bounds.minX + preset.padding * 2 + borderTotal));
  const minCanvasH = Math.max(1, Math.round(bounds.maxY - bounds.minY + preset.padding * 2 + borderTotal));

  let canvasW = minCanvasW;
  let canvasH = minCanvasH;

  if (preset.ratio !== "Auto") {
    const [rw, rh] = parseRatio(preset.ratio);
    const targetAspect = rw / rh;
    const currentAspect = minCanvasW / minCanvasH;
    if (currentAspect > targetAspect) {
      canvasH = minCanvasW / targetAspect;
    } else {
      canvasW = minCanvasH * targetAspect;
    }
  }

  const contentW = Math.max(1, Math.round(bounds.maxX - bounds.minX));
  const contentH = Math.max(1, Math.round(bounds.maxY - bounds.minY));
  const contentOffsetX = Math.round((canvasW - contentW) / 2 - bounds.minX);
  const contentOffsetY = Math.round((canvasH - contentH) / 2 - bounds.minY);

  return {
    canvasW: Math.round(canvasW),
    canvasH: Math.round(canvasH),
    contentOffsetX,
    contentOffsetY,
    contentW,
    contentH,
  };
}

export function drawCanvasDocument(
  ctx: CanvasRenderingContext2D,
  canvasDocument: CanvasDocument,
  preset: EditorPreset,
  dims: CanvasDocumentDimensions
): void {
  const {
    canvasW,
    canvasH,
    contentOffsetX,
    contentOffsetY,
  } = dims;
  const {
    bg_mode, bg_value, bg_colors, bg_gradient_type, bg_angle, bg_radius,
    shadow_enabled, shadow_blur, shadow_opacity, shadow_angle, shadow_offset,
  } = preset;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  if (bg_mode === "Solid") {
    ctx.fillStyle = bg_value || "#000000";
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else if (bg_mode === "Gradient") {
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
    stops.forEach((color, index) => {
      gradient.addColorStop(index / Math.max(1, stops.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else if (bg_mode === "Wallpaper") {
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

  const sortedImages = [...canvasDocument.images];
  for (const imageObject of sortedImages) {
    drawCanvasImage(ctx, imageObject, preset, contentOffsetX, contentOffsetY, {
      shadow_enabled,
      shadow_blur,
      shadow_opacity,
      shadow_angle,
      shadow_offset,
    });
  }
}

function drawCanvasImage(
  ctx: CanvasRenderingContext2D,
  imageObject: CanvasImageObject,
  preset: EditorPreset,
  contentOffsetX: number,
  contentOffsetY: number,
  shadow: {
    shadow_enabled: boolean;
    shadow_blur: number;
    shadow_opacity: number;
    shadow_angle: number;
    shadow_offset: number;
  }
) {
  const drawX = Math.round(imageObject.x + contentOffsetX);
  const drawY = Math.round(imageObject.y + contentOffsetY);
  const drawW = Math.round(imageObject.width);
  const drawH = Math.round(imageObject.height);
  const framePadding = preset.border_width;
  const fx = drawX - framePadding;
  const fy = drawY - framePadding;
  const fw = drawW + framePadding * 2;
  const fh = drawH + framePadding * 2;
  const fr = preset.radius + framePadding;

  if (shadow.shadow_enabled) {
    ctx.save();
    const angleRad = (shadow.shadow_angle - 90) * (Math.PI / 180);
    const shadowX = Math.cos(angleRad) * shadow.shadow_offset;
    const shadowY = Math.sin(angleRad) * shadow.shadow_offset;
    const offscreenOffset = 10000;
    ctx.shadowOffsetX = shadowX + offscreenOffset;
    ctx.shadowOffsetY = shadowY;
    ctx.shadowBlur = shadow.shadow_blur;
    ctx.shadowColor = `rgba(0, 0, 0, ${shadow.shadow_opacity})`;
    ctx.fillStyle = "black";
    roundedRect(ctx, fx - offscreenOffset, fy, fw, fh, fr);
    ctx.fill();
    ctx.restore();
  }

  if (framePadding > 0) {
    ctx.save();
    ctx.fillStyle = preset.border_color || "rgba(15, 23, 42, 0.8)";
    roundedRect(ctx, fx, fy, fw, fh, fr);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (preset.radius > 0) {
    roundedRect(ctx, drawX, drawY, drawW, drawH, preset.radius);
    ctx.clip();
  }
  const source = imageObject.sourceCrop;
  if (source) {
    ctx.drawImage(
      imageObject.image,
      source.x,
      source.y,
      source.w,
      source.h,
      drawX,
      drawY,
      drawW,
      drawH
    );
  } else {
    ctx.drawImage(imageObject.image, drawX, drawY, drawW, drawH);
  }
  ctx.restore();

  if (framePadding > 0) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    roundedRect(ctx, drawX, drawY, drawW, drawH, preset.radius);
    ctx.stroke();
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

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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
