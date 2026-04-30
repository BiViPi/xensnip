import { EditorPreset } from "./preset";
import { drawComposition } from "./core";

export function composeToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  preset: EditorPreset
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawComposition(ctx, image, preset, canvas.width, canvas.height);
}

export async function composeToBlob(
  image: HTMLImageElement,
  preset: EditorPreset
): Promise<Uint8Array> {
  const { padding } = preset;
  
  // Calculate output dimensions based on image + padding
  // In the real app, we might need to handle ratio here too
  const canvasW = image.width + padding * 2;
  const canvasH = image.height + padding * 2;

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
