import { useState, useCallback } from 'react';
import { EditorPreset } from '../compose/preset';
import { getCompositionDimensions } from '../compose/core';
import { useAnnotationStore } from '../annotate/state/store';

export interface CropBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * useCropTool — composition-aware crop.
 *
 * Crop bounds are expressed in composition canvas space (i.e. the full
 * composed canvas, not raw image space).  The CropOverlay must be
 * positioned/sized relative to the preview canvas wrapper, so callers
 * should multiply bounds by previewScale when rendering.
 */
export function useCropTool(
  image: HTMLImageElement | null,
  preset: EditorPreset,
  setImage: (img: HTMLImageElement) => void,
  setActiveTool: (tool: any) => void
) {
  const { objects, clearAll } = useAnnotationStore();
  const [cropBounds, setCropBounds] = useState<CropBounds | null>(null);

  const startCrop = useCallback(() => {
    if (!image) return;
    // Get composition-aware draw bounds so the initial crop frame
    // aligns with the visible screenshot content, not the raw image origin.
    const dims = getCompositionDimensions(image.width, image.height, preset);
    setCropBounds({
      x: dims.drawX,
      y: dims.drawY,
      w: dims.drawW,
      h: dims.drawH,
    });
  }, [image, preset]);

  const cancelCrop = useCallback(() => {
    setCropBounds(null);
    setActiveTool('select');
  }, [setActiveTool]);

  const commitCrop = useCallback(async () => {
    if (!image || !cropBounds) return;

    // Translate crop bounds from composition canvas space to raw image space.
    const dims = getCompositionDimensions(image.width, image.height, preset);

    // The scale factor from raw image to draw area
    const scaleX = dims.drawW / image.width;
    const scaleY = dims.drawH / image.height;

    // Convert crop bounds (in composition canvas) to raw image coords
    const srcX = Math.round((cropBounds.x - dims.drawX) / scaleX);
    const srcY = Math.round((cropBounds.y - dims.drawY) / scaleY);
    const srcW = Math.round(cropBounds.w / scaleX);
    const srcH = Math.round(cropBounds.h / scaleY);

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(srcX, image.width));
    const clampedY = Math.max(0, Math.min(srcY, image.height));
    const clampedW = Math.max(1, Math.min(srcW, image.width - clampedX));
    const clampedH = Math.max(1, Math.min(srcH, image.height - clampedY));

    const canvas = document.createElement('canvas');
    canvas.width = clampedW;
    canvas.height = clampedH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(image, clampedX, clampedY, clampedW, clampedH, 0, 0, clampedW, clampedH);

    const newImg = new Image();
    newImg.src = canvas.toDataURL('image/png');
    await new Promise<void>((resolve) => { newImg.onload = () => resolve(); });

    setImage(newImg);
    clearAll();
    setCropBounds(null);
    setActiveTool('select');
  }, [image, cropBounds, preset, setImage, clearAll, setActiveTool]);

  return {
    cropBounds,
    setCropBounds,
    startCrop,
    cancelCrop,
    commitCrop,
    hasAnnotations: objects.length > 0,
  };
}
