import Konva from 'konva';
import { getCompositionDimensions, drawComposition, preloadWallpaper } from "./core";
import type { EditorPreset } from "./preset";
import { AnnotateObject } from "../annotate/state/types";
import { createArrowNode } from "../annotate/renderers/ArrowRenderer";
import { createRectangleNode } from "../annotate/renderers/RectangleRenderer";
import { createTextNode } from "../annotate/renderers/TextRenderer";
import { renderBlur } from "../annotate/renderers/BlurRenderer";
import { createNumberedNode } from "../annotate/renderers/NumberedRenderer";

export async function composeWithAnnotations(
  image: HTMLImageElement,
  preset: EditorPreset,
  objects: AnnotateObject[],
  format: string = "image/png",
  quality: number = 1.0
): Promise<Uint8Array> {
  const dims = getCompositionDimensions(image.width, image.height, preset);
  const canvas = document.createElement("canvas");
  canvas.width = dims.canvasW;
  canvas.height = dims.canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  if (preset.bg_mode === "Wallpaper") {
    await preloadWallpaper(preset.bg_value).catch(console.error);
  }

  // 1. Draw base composition
  drawComposition(ctx, image, preset, dims);

  // 2. Draw annotations
  if (objects.length > 0) {
    const container = document.createElement('div');
    const stage = new Konva.Stage({
      container: container,
      width: dims.canvasW,
      height: dims.canvasH
    });
    const layer = new Konva.Layer();
    stage.add(layer);

    for (const obj of objects) {
      if (obj.type === 'blur') {
        renderBlur(ctx, obj, canvas);
      } else if (obj.type === 'arrow') {
        layer.add(createArrowNode(obj as any));
      } else if (obj.type === 'rectangle') {
        layer.add(createRectangleNode(obj as any));
      } else if (obj.type === 'text') {
        layer.add(createTextNode(obj as any));
      } else if (obj.type === 'numbered') {
        layer.add(createNumberedNode(obj as any));
      }
    }
    
    layer.draw();
    
    // Draw Konva canvas onto main canvas
    ctx.drawImage(layer.getCanvas()._canvas, 0, 0);
    
    stage.destroy();
  }

  // 3. Export to bytes
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob failed"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsArrayBuffer(blob);
    }, format, quality);
  });
}
