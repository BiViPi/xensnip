import Konva from 'konva';
import { getCompositionDimensions, drawComposition, preloadWallpaper } from "./core";
import type { EditorPreset } from "./preset";
import { getSelectedCanvasImage, type CanvasDocument } from "../editor/canvasDocument";
import { drawCanvasDocument, getCanvasDocumentDimensions } from "./canvasDocument";
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
import { renderSpotlights } from "../annotate/renderers/SpotlightRenderer";
import { renderMagnify } from "../annotate/renderers/MagnifyRenderer";
import { renderSimplifyUi } from "../annotate/renderers/SimplifyUiRenderer";
import { renderPixelRuler } from "../annotate/renderers/PixelRulerRenderer";
import { createSpeechBubbleNode } from "../annotate/renderers/SpeechBubbleRenderer";
import { createCalloutNode } from "../annotate/renderers/CalloutRenderer";
import { createFreehandArrowNode } from "../annotate/renderers/FreehandArrowRenderer";
import { renderPixelate } from "../annotate/renderers/PixelateRenderer";
import { renderOpaqueRedact } from "../annotate/renderers/OpaqueRedactRenderer";

interface ComposedCanvasResult {
  canvas: HTMLCanvasElement;
  canvasW: number;
  canvasH: number;
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
}

async function renderComposedCanvas(
  image: HTMLImageElement,
  preset: EditorPreset,
  objects: AnnotateObject[],
  canvasDocument?: CanvasDocument
): Promise<ComposedCanvasResult> {
  const dims = canvasDocument
    ? getCanvasDocumentDimensions(canvasDocument, preset)
    : null;
  const singleImageDims = canvasDocument
    ? null
    : getCompositionDimensions(image.width, image.height, preset);
  const canvasW = canvasDocument ? dims!.canvasW : singleImageDims!.canvasW;
  const canvasH = canvasDocument ? dims!.canvasH : singleImageDims!.canvasH;

  const selected = canvasDocument ? getSelectedCanvasImage(canvasDocument) : null;
  const screenX = canvasDocument
    ? Math.round(dims!.contentOffsetX + (selected?.x ?? 0))
    : singleImageDims!.drawX;
  const screenY = canvasDocument
    ? Math.round(dims!.contentOffsetY + (selected?.y ?? 0))
    : singleImageDims!.drawY;
  const screenW = Math.max(
    1,
    canvasDocument ? Math.round(selected?.width ?? image.width) : Math.round(singleImageDims!.drawW)
  );
  const screenH = Math.max(
    1,
    canvasDocument ? Math.round(selected?.height ?? image.height) : Math.round(singleImageDims!.drawH)
  );

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  if (preset.bg_mode === "Wallpaper") {
    await preloadWallpaper(preset.bg_value).catch(console.error);
  }

  // 1. Draw base composition
  if (canvasDocument) {
    drawCanvasDocument(ctx, canvasDocument, preset, dims!);
  } else {
    drawComposition(ctx, image, preset, singleImageDims!);
  }

  // 2. Draw annotations in exact document Z-order
  if (objects.length > 0) {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = canvasW;
    sourceCanvas.height = canvasH;
    const sourceCtx = sourceCanvas.getContext('2d');
    const refreshSamplingCanvas = () => {
      if (!sourceCtx) return;
      sourceCtx.clearRect(0, 0, canvasW, canvasH);
      sourceCtx.drawImage(canvas, 0, 0, canvasW, canvasH);
    };
    refreshSamplingCanvas();

    const allSpotlights = objects.filter((o): o is SpotlightObject => o.type === 'spotlight');
    let lastSpotlightIndex = -1;
    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].type === 'spotlight') {
        lastSpotlightIndex = i;
        break;
      }
    }

    const container = document.createElement('div');
    const stage = new Konva.Stage({
      container,
      width: canvasW,
      height: canvasH,
    });

    try {
      const layer = new Konva.Layer();
      // Lock pixelRatio to 1 so HiDPI window.devicePixelRatio > 1 never scales/clips exports.
      layer.getCanvas().setPixelRatio(1);
      stage.add(layer);

      const flushKonvaLayer = () => {
        if (!layer.hasChildren()) return;
        layer.draw();
        ctx.drawImage(layer.getCanvas()._canvas, 0, 0, canvasW, canvasH);
        layer.destroyChildren();
      };

      for (let idx = 0; idx < objects.length; idx++) {
        const obj = objects[idx];
        switch (obj.type) {
          case 'arrow':
            layer.add(createArrowNode(obj as ArrowObject));
            break;
          case 'rectangle':
            layer.add(createRectangleNode(obj as RectangleObject));
            break;
          case 'text':
            layer.add(createTextNode(obj as TextObject));
            break;
          case 'numbered':
            layer.add(createNumberedNode(obj as NumberedObject));
            break;
          case 'spotlight':
            if (idx === lastSpotlightIndex && allSpotlights.length > 0) {
              flushKonvaLayer();
              renderSpotlights(ctx, allSpotlights, canvasW, canvasH);
            }
            break;
          case 'speech_bubble':
            layer.add(createSpeechBubbleNode(obj as SpeechBubbleObject));
            break;
          case 'callout':
            layer.add(createCalloutNode(obj as CalloutObject));
            break;
          case 'freehand_arrow':
            layer.add(createFreehandArrowNode(obj as FreehandArrowObject));
            break;
          case 'blur':
            flushKonvaLayer();
            renderBlur(ctx, obj as BlurObject, canvas);
            break;
          case 'magnify':
            flushKonvaLayer();
            refreshSamplingCanvas();
            renderMagnify(ctx, obj as MagnifyObject, sourceCanvas);
            break;
          case 'simplify_ui':
            flushKonvaLayer();
            refreshSamplingCanvas();
            renderSimplifyUi(ctx, obj as SimplifyUiObject, sourceCanvas);
            break;
          case 'pixel_ruler':
            flushKonvaLayer();
            renderPixelRuler(ctx, obj as PixelRulerObject);
            break;
          case 'pixelate':
            flushKonvaLayer();
            refreshSamplingCanvas();
            renderPixelate(ctx, obj as PixelateObject, sourceCanvas);
            break;
          case 'opaque_redact':
            flushKonvaLayer();
            renderOpaqueRedact(ctx, obj as OpaqueRedactObject);
            break;
        }
      }

      flushKonvaLayer();
    } finally {
      stage.destroy();
    }
  }

  return { canvas, canvasW, canvasH, screenX, screenY, screenW, screenH };
}

export async function composeWithAnnotations(
  image: HTMLImageElement,
  preset: EditorPreset,
  objects: AnnotateObject[],
  format: string = "image/png",
  quality: number = 1.0,
  canvasDocument?: CanvasDocument
): Promise<Uint8Array> {
  const { canvas } = await renderComposedCanvas(image, preset, objects, canvasDocument);

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

function loadCanvasAsImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  const isBrowser = (Konva as unknown as { isBrowser?: boolean }).isBrowser !== false;
  if (!isBrowser) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to decode baked Studio screen image"));
      img.src = canvas.toDataURL("image/png");
    });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Baked Studio screen canvas toBlob failed"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to decode baked Studio screen image"));
      };
      img.src = url;
    }, "image/png");
  });
}

/**
 * Produces the annotated (and cropped) screenshot content image for 2.5D Studio frames,
 * excluding 2D outer padding, border highlight, and 2D shadow.
 */
export async function composeAnnotatedScreenImage(
  image: HTMLImageElement,
  preset: EditorPreset,
  objects: AnnotateObject[],
  canvasDocument?: CanvasDocument
): Promise<HTMLImageElement> {
  // Keep total inner margin identical to 2D composition (padding + border_width) so object coords match 1:1,
  // while disabling 2D corner clipping, 2D border highlight, and 2D shadow on the baked screen surface.
  const bakePreset: EditorPreset = {
    ...preset,
    padding: preset.padding + preset.border_width,
    border_width: 0,
    radius: 0,
    shadow_enabled: false,
  };

  if (objects.length === 0) {
    const selected = canvasDocument ? getSelectedCanvasImage(canvasDocument) : null;
    const screenW = Math.max(1, Math.round(selected?.width ?? image.width));
    const screenH = Math.max(1, Math.round(selected?.height ?? image.height));
    const outCanvas = document.createElement("canvas");
    outCanvas.width = screenW;
    outCanvas.height = screenH;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) throw new Error("Could not get baked Studio canvas context");

    if (selected?.sourceCrop) {
      const sc = selected.sourceCrop;
      outCtx.drawImage(selected.image, sc.x, sc.y, sc.w, sc.h, 0, 0, screenW, screenH);
    } else {
      outCtx.drawImage(selected?.image ?? image, 0, 0, screenW, screenH);
    }
    return loadCanvasAsImage(outCanvas);
  }

  const { canvas, screenX, screenY, screenW, screenH } = await renderComposedCanvas(
    image,
    bakePreset,
    objects,
    canvasDocument
  );

  const outCanvas = document.createElement("canvas");
  outCanvas.width = screenW;
  outCanvas.height = screenH;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Could not get baked Studio output context");

  outCtx.drawImage(canvas, screenX, screenY, screenW, screenH, 0, 0, screenW, screenH);
  return loadCanvasAsImage(outCanvas);
}
