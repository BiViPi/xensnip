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
