export function getCompositionCoordinates(
  stageX: number,
  stageY: number,
  compositionWidth: number,
  compositionHeight: number
) {
  // Clamp coordinates strictly to the composition canvas bounds
  const x = Math.max(0, Math.min(compositionWidth - 1, Math.floor(stageX)));
  const y = Math.max(0, Math.min(compositionHeight - 1, Math.floor(stageY)));

  return { x, y };
}

export function getCanvasRenderScale(
  canvas: { width: number; height: number },
  stageWidth?: number,
  stageHeight?: number
): { scaleX: number; scaleY: number } {
  const sw = stageWidth && stageWidth > 0 ? stageWidth : canvas.width;
  const sh = stageHeight && stageHeight > 0 ? stageHeight : canvas.height;
  return {
    scaleX: sw > 0 && canvas.width > 0 ? canvas.width / sw : 1,
    scaleY: sh > 0 && canvas.height > 0 ? canvas.height / sh : 1,
  };
}
