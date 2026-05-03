import Konva from 'konva';
import { ArrowObject } from '../state/types';

export function createArrowNode(obj: ArrowObject): Konva.Arrow {
  return new Konva.Arrow({
    id: obj.id,
    points: obj.points,
    x: obj.x,
    y: obj.y,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    pointerLength: obj.pointerLength,
    pointerWidth: obj.pointerWidth,
    draggable: obj.draggable,
    dash: obj.style === 'dashed' ? [10, 5] : undefined,
    strokeScaleEnabled: false,
    hitStrokeWidth: 25,
    name: 'selectable-object'
  });
}
