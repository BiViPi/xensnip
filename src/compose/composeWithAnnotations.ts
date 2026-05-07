import Konva from 'konva';
import { getCompositionDimensions, drawComposition, preloadWallpaper } from "./core";
import type { EditorPreset } from "./preset";
import { 
  AnnotateObject, 
  ArrowObject, 
  RectangleObject, 
  TextObject, 
  BlurObject, 
  NumberedObject, 
  SpotlightObject, 
  MagnifyObject, 
  SimplifyUiObject, 
  PixelRulerObject, 
  SpeechBubbleObject, 
  CalloutObject, 
  FreehandArrowObject, 
  PixelateObject, 
  OpaqueRedactObject 
} from "../annotate/state/types";
import { createArrowNode } from "../annotate/renderers/ArrowRenderer";
import { createRectangleNode } from "../annotate/renderers/RectangleRenderer";
import { createTextNode } from "../annotate/renderers/TextRenderer";
import { renderBlur } from "../annotate/renderers/BlurRenderer";
import { createNumberedNode } from "../annotate/renderers/NumberedRenderer";
import { createSpotlightNodes } from "../annotate/renderers/SpotlightRenderer";
import { renderMagnify } from "../annotate/renderers/MagnifyRenderer";
import { renderSimplifyUi } from "../annotate/renderers/SimplifyUiRenderer";
import { renderPixelRuler } from "../annotate/renderers/PixelRulerRenderer";
import { createSpeechBubbleNode } from "../annotate/renderers/SpeechBubbleRenderer";
import { createCalloutNode } from "../annotate/renderers/CalloutRenderer";
import { createFreehandArrowNode } from "../annotate/renderers/FreehandArrowRenderer";
import { renderPixelate } from "../annotate/renderers/PixelateRenderer";
import { renderOpaqueRedact } from "../annotate/renderers/OpaqueRedactRenderer";

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
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = canvas.width;
  sourceCanvas.height = canvas.height;
  const sourceCtx = sourceCanvas.getContext('2d');
  sourceCtx?.drawImage(canvas, 0, 0);

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

    const RENDERERS: Record<AnnotateObject['type'], (obj: any) => void> = {
      blur: (obj: BlurObject) => renderBlur(ctx, obj, canvas),
      arrow: (obj: ArrowObject) => layer.add(createArrowNode(obj)),
      rectangle: (obj: RectangleObject) => layer.add(createRectangleNode(obj)),
      text: (obj: TextObject) => layer.add(createTextNode(obj)),
      numbered: (obj: NumberedObject) => layer.add(createNumberedNode(obj)),
      spotlight: (obj: SpotlightObject) => {
        for (const node of createSpotlightNodes(obj, dims.canvasW, dims.canvasH)) {
          layer.add(node);
        }
      },
      magnify: (obj: MagnifyObject) => renderMagnify(ctx, obj, sourceCanvas),
      simplify_ui: (obj: SimplifyUiObject) => renderSimplifyUi(ctx, obj, sourceCanvas),
      pixel_ruler: (obj: PixelRulerObject) => renderPixelRuler(ctx, obj),
      speech_bubble: (obj: SpeechBubbleObject) => layer.add(createSpeechBubbleNode(obj)),
      callout: (obj: CalloutObject) => layer.add(createCalloutNode(obj)),
      freehand_arrow: (obj: FreehandArrowObject) => layer.add(createFreehandArrowNode(obj)),
      pixelate: (obj: PixelateObject) => renderPixelate(ctx, obj, sourceCanvas),
      opaque_redact: (obj: OpaqueRedactObject) => renderOpaqueRedact(ctx, obj),
    };

    for (const obj of objects) {
      const renderer = RENDERERS[obj.type];
      if (renderer) {
        renderer(obj);
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
