import { useMemo } from 'react';
import { EditorPreset } from '../compose/preset';
import { getCompositionDimensions } from '../compose/core';

interface ViewportSize {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

    const leftPanelReserve = clamp(viewportSize.width * 0.16, 176, 256);
    const rightRailReserve = clamp(viewportSize.width * 0.07, 92, 140);
    const topInset = clamp(viewportSize.height * 0.075, 68, 96);
    const bottomInset = clamp(viewportSize.height * 0.055, 36, 64);
    const dockReserve = clamp(viewportSize.height * 0.16, 160, 220);

    const previewBudgetW = Math.max(
      320,
      viewportSize.width - leftPanelReserve - rightRailReserve
    );
    const previewBudgetH = Math.max(
      220,
      viewportSize.height - topInset - bottomInset - dockReserve
    );

    const previewScale = dims.canvasW > 0 
      ? Math.min(previewBudgetW / dims.canvasW, previewBudgetH / dims.canvasH, 2)
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
      centerY,
      layout: {
        topInset,
        rightRailReserve,
        bottomInset,
        leftPanelReserve,
        dockReserve,
      }
    };
  }, [image, preset, viewportSize]);
}
