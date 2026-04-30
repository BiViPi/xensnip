import { EditorPreset } from "./preset";
import { drawComposition, getCompositionDimensions } from "./core";

export function composeToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  preset: EditorPreset
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { canvasW, canvasH } = getCompositionDimensions(image.width, image.height, preset);
  
  // Sizing is usually reactive in EditorHost, but we sync here for safety
  if (canvas.width !== canvasW) canvas.width = canvasW;
  if (canvas.height !== canvasH) canvas.height = canvasH;

  drawComposition(ctx, image, preset, canvasW, canvasH);
}

export async function composeToBlob(
  image: HTMLImageElement,
  preset: EditorPreset
): Promise<Uint8Array> {
  const { canvasW, canvasH } = getCompositionDimensions(image.width, image.height, preset);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context");

  drawComposition(ctx, image, preset, canvasW, canvasH);

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

/** Helper to load an image from a URI */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src} — ${e}`));
    img.src = src;
  });
}
