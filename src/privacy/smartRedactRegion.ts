import type { EditorPreset } from '../compose/preset';
import { getCompositionDimensions } from '../compose/core';

export interface SmartRedactRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResolveSmartRedactRegionArgs {
  canvasWidth: number;
  canvasHeight: number;
  scope: 'full_canvas' | 'selection';
  selectionRect: SelectionRect | null;
  image: HTMLImageElement | null;
  preset: EditorPreset;
}

function clampRegion(
  region: SmartRedactRegion,
  canvasWidth: number,
  canvasHeight: number
): SmartRedactRegion {
  const x = Math.max(0, Math.min(canvasWidth - 1, Math.floor(region.x)));
  const y = Math.max(0, Math.min(canvasHeight - 1, Math.floor(region.y)));
  const width = Math.max(1, Math.min(canvasWidth - x, Math.ceil(region.width)));
  const height = Math.max(1, Math.min(canvasHeight - y, Math.ceil(region.height)));
  return { x, y, width, height };
}

function scaleRegionToCanvas(
  region: SmartRedactRegion,
  compositionWidth: number,
  compositionHeight: number,
  canvasWidth: number,
  canvasHeight: number
): SmartRedactRegion {
  const scaleX = compositionWidth > 0 ? canvasWidth / compositionWidth : 1;
  const scaleY = compositionHeight > 0 ? canvasHeight / compositionHeight : 1;

  return clampRegion(
    {
      x: region.x * scaleX,
      y: region.y * scaleY,
      width: region.width * scaleX,
      height: region.height * scaleY,
    },
    canvasWidth,
    canvasHeight
  );
}

export function resolveSmartRedactRegion({
  canvasWidth,
  canvasHeight,
  scope,
  selectionRect,
  image,
  preset,
}: ResolveSmartRedactRegionArgs): SmartRedactRegion | undefined {
  if (!image) {
    return undefined;
  }

  const dims = getCompositionDimensions(image.width, image.height, preset);

  if (scope === 'selection') {
    if (!selectionRect) {
      return undefined;
    }

    return scaleRegionToCanvas(
      selectionRect,
      dims.canvasW,
      dims.canvasH,
      canvasWidth,
      canvasHeight
    );
  }

  return scaleRegionToCanvas(
    {
      x: dims.drawX,
      y: dims.drawY,
      width: dims.drawW,
      height: dims.drawH,
    },
    dims.canvasW,
    dims.canvasH,
    canvasWidth,
    canvasHeight
  );
}
