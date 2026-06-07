import { preloadWallpaper } from '../compose/core';
import { drawCanvasDocument, getCanvasDocumentDimensions } from '../compose/canvasDocument';
import type { EditorPreset } from '../compose/preset';
import type { CanvasDocument } from './canvasDocument';

/**
 * Generates a higher-density thumbnail sized for the left-panel card.
 * Preserves aspect ratio and keeps enough source pixels for HiDPI displays.
 */
export async function generateThumbnail(img: HTMLImageElement): Promise<string> {
  const displayWidth = 192;
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const renderScale = Math.min(Math.max(devicePixelRatio, 1), 2);
  const targetWidth = Math.min(img.width, Math.max(displayWidth, Math.round(displayWidth * renderScale)));
  const aspectRatio = img.height / img.width;
  const targetHeight = Math.round(targetWidth * aspectRatio);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context for thumbnail generation');
  }

  // Use better scaling quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL('image/png');
}

export async function generateCanvasDocumentThumbnail(
  canvasDocument: CanvasDocument,
  preset: EditorPreset
): Promise<string> {
  if (preset.bg_mode === 'Wallpaper') {
    await preloadWallpaper(preset.bg_value).catch(console.error);
  }

  const dims = getCanvasDocumentDimensions(canvasDocument, preset);
  const displayWidth = 192;
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const renderScale = Math.min(Math.max(devicePixelRatio, 1), 2);
  const targetWidth = Math.max(
    displayWidth,
    Math.round(displayWidth * renderScale)
  );
  const aspectRatio = dims.canvasH / dims.canvasW;
  const targetHeight = Math.max(1, Math.round(targetWidth * aspectRatio));

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = dims.canvasW;
  renderCanvas.height = dims.canvasH;
  const renderCtx = renderCanvas.getContext('2d');
  if (!renderCtx) {
    throw new Error('Could not get canvas context for canvas thumbnail generation');
  }

  drawCanvasDocument(renderCtx, canvasDocument, preset, dims);

  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.width = targetWidth;
  thumbnailCanvas.height = targetHeight;
  const thumbnailCtx = thumbnailCanvas.getContext('2d');
  if (!thumbnailCtx) {
    throw new Error('Could not get canvas context for thumbnail scaling');
  }

  thumbnailCtx.imageSmoothingEnabled = true;
  thumbnailCtx.imageSmoothingQuality = 'high';
  thumbnailCtx.drawImage(renderCanvas, 0, 0, targetWidth, targetHeight);

  return thumbnailCanvas.toDataURL('image/png');
}

export async function generateDocumentThumbnail(input: {
  image: HTMLImageElement;
  canvas: CanvasDocument;
  preset: EditorPreset;
}): Promise<string> {
  const requiresCanvasRenderer =
    input.canvas.images.length > 1 ||
    input.canvas.images.some((imageObject) => imageObject.sourceCrop !== null);

  if (requiresCanvasRenderer) {
    return generateCanvasDocumentThumbnail(input.canvas, input.preset);
  }

  return generateThumbnail(input.image);
}
