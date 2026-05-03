import { useMemo } from 'react';
import { EditorPreset } from '../compose/preset';
import { getCompositionDimensions } from '../compose/core';

interface ViewportSize {
  width: number;
  height: number;
}

export function usePreviewMetrics(
  image: HTMLImageElement | null,
  preset: EditorPreset,
  viewportSize: ViewportSize
) {
  return useMemo(() => {
    const dims = image 
      ? getCompositionDimensions(image.width, image.height, preset) 
      : { canvasW: 0, canvasH: 0, drawX: 0, drawY: 0, drawW: 0, drawH: 0 };

    const previewBudgetW = viewportSize.width * 0.74;
    const previewBudgetH = viewportSize.height * 0.66;

    const previewScale = dims.canvasW > 0 
      ? Math.min(previewBudgetW / dims.canvasW, previewBudgetH / dims.canvasH, 1) 
      : 1;

    const previewW = Math.floor(dims.canvasW * previewScale);
    const previewH = Math.floor(dims.canvasH * previewScale);

    const centerX = (dims.drawX + dims.drawW / 2) * previewScale;
    const centerY = (dims.drawY + dims.drawH / 2) * previewScale;

    return {
      dims,
      previewScale,
      previewW,
      previewH,
      centerX,
      centerY
    };
  }, [image, preset, viewportSize]);
}
