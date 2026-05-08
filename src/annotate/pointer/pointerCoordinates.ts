import Konva from 'konva';

export interface PointerCoords {
  stageX: number;
  stageY: number;
}

export function getPointerCoords(
  e: Konva.KonvaEventObject<MouseEvent>,
  scale: number
): PointerCoords | null {
  const stage = e.target.getStage();
  const pos = stage?.getPointerPosition();
  if (!stage || !pos) return null;
  return { stageX: pos.x / scale, stageY: pos.y / scale };
}
