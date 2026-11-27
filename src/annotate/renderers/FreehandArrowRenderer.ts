import Konva from 'konva';
import { FreehandArrowObject } from '../state/types';

export function createFreehandArrowNode(obj: FreehandArrowObject): Konva.Arrow {
  const showArrowhead = obj.pointerLength > 0 && obj.pointerWidth > 0;

  return new Konva.Arrow({
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    points: obj.points,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    tension: obj.smoothing,
    pointerAtEnding: showArrowhead,
    pointerLength: obj.pointerLength,
    pointerWidth: obj.pointerWidth,
    lineCap: 'round',
    lineJoin: 'round',
  });
}
