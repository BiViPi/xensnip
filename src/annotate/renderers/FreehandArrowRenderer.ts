import Konva from 'konva';
import { FreehandArrowObject } from '../state/types';

export function createFreehandArrowNode(obj: FreehandArrowObject): Konva.Arrow {
  return new Konva.Arrow({
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    points: obj.points,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    tension: obj.smoothing,
    pointerLength: obj.pointerLength,
    pointerWidth: obj.pointerWidth,
    lineCap: 'round',
    lineJoin: 'round',
  });
}
