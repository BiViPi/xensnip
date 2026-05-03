import Konva from 'konva';
import { RectangleObject } from '../state/types';

export function createRectangleNode(obj: RectangleObject): Konva.Rect {
  return new Konva.Rect({
    id: obj.id,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    fill: obj.fill,
    cornerRadius: obj.cornerRadius,
    draggable: obj.draggable,
    strokeScaleEnabled: false,
    name: 'selectable-object'
  });
}
