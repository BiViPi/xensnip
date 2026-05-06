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
  viewportSize: ViewportSize,
  panelReserveWidth: number = 272
) {
  return useMemo(() => {
    const dims = image 
      ? getCompositionDimensions(image.width, image.height, preset) 
      : { canvasW: 0, canvasH: 0, drawX: 0, drawY: 0, drawW: 0, drawH: 0 };

    const leftPanelReserve = panelReserveWidth;
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

    // PIXEL PERFECT PREVIEW: Never upscale the screenshot by default.
    // This ensures maximum sharpness like ShareX. We only scale DOWN if the image is larger than the viewport.
    const previewScale = dims.canvasW > 0 
      ? Math.min(previewBudgetW / dims.canvasW, previewBudgetH / dims.canvasH, 1.0)
      : 1;
    const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const previewRenderScale = clamp(Math.max(1, previewScale) * devicePixelRatio, 1, 2);

    const previewW = Math.floor(dims.canvasW * previewScale);
    const previewH = Math.floor(dims.canvasH * previewScale);

    const centerX = (dims.drawX + dims.drawW / 2) * previewScale;
    const centerY = (dims.drawY + dims.drawH / 2) * previewScale;
    const previewCenterOffsetX = 0;
    const previewViewportCenterOffsetX = (leftPanelReserve - rightRailReserve) / 2;

    const result = {
      dims,
      previewScale,
      previewRenderScale,
      previewW,
      previewH,
      centerX,
      centerY,
      previewCenterOffsetX,
      previewViewportCenterOffsetX,
      layout: {
        topInset,
        rightRailReserve,
        bottomInset,
        leftPanelReserve,
        dockReserve,
      }
    };
    if (image) {
      console.debug(`[MP-D Meta] previewScale: ${previewScale.toFixed(4)}, previewRenderScale: ${previewRenderScale.toFixed(4)}, DPR: ${devicePixelRatio}`);
    }
    return result;
  }, [image, preset, viewportSize, panelReserveWidth]);
}
