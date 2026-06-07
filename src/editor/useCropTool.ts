import { useState, useCallback } from 'react';
import { EditorPreset } from '../compose/preset';
import { useAnnotationStore } from '../annotate/state/store';
import { ToolId } from '../annotate/state/types';
import { recordHistorySnapshot, withHistorySuspended } from './historyBridge';
import { CanvasDocument, getSelectedCanvasImage, replaceCanvasImage } from './canvasDocument';
import { getCanvasDocumentDimensions } from '../compose/canvasDocument';

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
  canvasDocument: CanvasDocument | null,
  preset: EditorPreset,
  setImage: (img: HTMLImageElement) => void,
  setActiveTool: (tool: ToolId) => void,
  onCommit?: (canvasDocument: CanvasDocument, img: HTMLImageElement) => void
) {
  const { objects, clearAll } = useAnnotationStore();
  const [cropBounds, setCropBounds] = useState<CropBounds | null>(null);

  const startCrop = useCallback(() => {
    if (!image || !canvasDocument) return;
    const selectedImage = getSelectedCanvasImage(canvasDocument);
    if (!selectedImage) return;

    // Get composition-aware draw bounds so the initial crop frame
    // aligns with the visible screenshot content, not the raw image origin.
    const dims = getCanvasDocumentDimensions(canvasDocument, preset);
    setCropBounds({
      x: dims.contentOffsetX + selectedImage.x,
      y: dims.contentOffsetY + selectedImage.y,
      w: selectedImage.width,
      h: selectedImage.height,
    });
  }, [canvasDocument, image, preset]);

  const cancelCrop = useCallback(() => {
    setCropBounds(null);
    setActiveTool('select');
  }, [setActiveTool]);

  const commitCrop = useCallback(async () => {
    if (!image || !cropBounds || !canvasDocument) return;
    const selectedImage = getSelectedCanvasImage(canvasDocument);
    if (!selectedImage) return;
    recordHistorySnapshot();

    const dims = getCanvasDocumentDimensions(canvasDocument, preset);
    const displayX = dims.contentOffsetX + selectedImage.x;
    const displayY = dims.contentOffsetY + selectedImage.y;
    const currentSource = selectedImage.sourceCrop ?? {
      x: 0,
      y: 0,
      w: selectedImage.image.width,
      h: selectedImage.image.height,
    };
    const scaleX = selectedImage.width / currentSource.w;
    const scaleY = selectedImage.height / currentSource.h;

    const srcX = Math.round(currentSource.x + (cropBounds.x - displayX) / scaleX);
    const srcY = Math.round(currentSource.y + (cropBounds.y - displayY) / scaleY);
    const srcW = Math.round(cropBounds.w / scaleX);
    const srcH = Math.round(cropBounds.h / scaleY);

    const clampedX = Math.max(0, Math.min(srcX, selectedImage.image.width));
    const clampedY = Math.max(0, Math.min(srcY, selectedImage.image.height));
    const clampedW = Math.max(1, Math.min(srcW, selectedImage.image.width - clampedX));
    const clampedH = Math.max(1, Math.min(srcH, selectedImage.image.height - clampedY));

    const nextCanvas = replaceCanvasImage(canvasDocument, selectedImage.id, {
      sourceCrop: {
        x: clampedX,
        y: clampedY,
        w: clampedW,
        h: clampedH,
      },
    });

    setImage(selectedImage.image);
    if (onCommit) onCommit(nextCanvas, selectedImage.image);
    if (canvasDocument.images.length <= 1) {
      withHistorySuspended(() => clearAll());
    }
    setCropBounds(null);
    setActiveTool('select');
  }, [image, cropBounds, canvasDocument, preset, setImage, clearAll, setActiveTool, onCommit]);

  return {
    cropBounds,
    setCropBounds,
    startCrop,
    cancelCrop,
    commitCrop,
    hasAnnotations: objects.length > 0,
  };
}
