import { getCompositionDimensions, drawComposition, preloadWallpaper } from "./core";
import type { EditorPreset } from "./preset";
import { ScreenshotDocument } from "../editor/useScreenshotDocuments";
import { composeWithAnnotations } from "./composeWithAnnotations";

export function composeToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  preset: EditorPreset,
  renderScale: number = 1
) {
  const dims = getCompositionDimensions(image.width, image.height, preset);
  const targetScale = Math.max(1, renderScale);
  const scaledCanvasW = Math.max(1, Math.round(dims.canvasW * targetScale));
  const scaledCanvasH = Math.max(1, Math.round(dims.canvasH * targetScale));
  const compositionCanvas = document.createElement("canvas");
  compositionCanvas.width = dims.canvasW;
  compositionCanvas.height = dims.canvasH;
  const compositionCtx = compositionCanvas.getContext("2d");
  if (!compositionCtx) return;
  
  // Sync canvas dimensions
  if (canvas.width !== scaledCanvasW) canvas.width = scaledCanvasW;
  if (canvas.height !== scaledCanvasH) canvas.height = scaledCanvasH;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  drawComposition(compositionCtx, image, preset, dims);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, scaledCanvasW, scaledCanvasH);
  ctx.imageSmoothingEnabled = targetScale > 1;
  ctx.imageSmoothingQuality = "high";
  console.debug(`[MP-D] Preview canvas: ${scaledCanvasW}x${scaledCanvasH}, renderScale: ${renderScale}`);
  ctx.drawImage(compositionCanvas, 0, 0, scaledCanvasW, scaledCanvasH);
}

export async function composeToBlob(image: HTMLImageElement, preset: EditorPreset, format: string = "image/png", quality: number = 1.0): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  const dims = getCompositionDimensions(image.width, image.height, preset);
  
  canvas.width = dims.canvasW;
  canvas.height = dims.canvasH;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  
  if (preset.bg_mode === "Wallpaper") {
    await preloadWallpaper(preset.bg_value).catch(console.error);
  }
  
  drawComposition(ctx, image, preset, dims);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob failed"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const blobBytes = new Uint8Array(arrayBuffer);
        console.debug(`[MP-E] Export blob: ${canvas.width}x${canvas.height}, bytes: ${blobBytes.length}, format: ${format}`);
        resolve(blobBytes);
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsArrayBuffer(blob);
    }, format, quality);
  });
}



export async function composeDocumentToBytes(
  doc: ScreenshotDocument,
  preset: EditorPreset,
  format: string = "image/png",
  quality: number = 1.0
): Promise<Uint8Array> {
  const img = doc.image;
  if (doc.annotation.objects.length > 0) {
    return composeWithAnnotations(img, preset, doc.annotation.objects, format, quality);
  } else {
    return composeToBlob(img, preset, format, quality);
  }
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}
