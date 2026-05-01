import { getCompositionDimensions, drawComposition } from "./core";
import type { EditorPreset } from "./preset";

export function composeToCanvas(canvas: HTMLCanvasElement, image: HTMLImageElement, preset: EditorPreset) {
  const dims = getCompositionDimensions(image.width, image.height, preset);
  
  // Sync canvas dimensions
  if (canvas.width !== dims.canvasW) canvas.width = dims.canvasW;
  if (canvas.height !== dims.canvasH) canvas.height = dims.canvasH;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  
  drawComposition(ctx, image, preset, dims);
}

export async function composeToBlob(image: HTMLImageElement, preset: EditorPreset): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  const dims = getCompositionDimensions(image.width, image.height, preset);
  
  canvas.width = dims.canvasW;
  canvas.height = dims.canvasH;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  
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
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsArrayBuffer(blob);
    }, "image/png");
  });
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}
