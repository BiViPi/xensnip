import Konva from 'konva';
import { NumberedObject } from '../state/types';

export function createNumberedNode(obj: NumberedObject): Konva.Group {
  const group = new Konva.Group({
    id: obj.id,
    x: obj.x,
    y: obj.y,
    draggable: obj.draggable,
    name: 'selectable-object'
  });

  const circle = new Konva.Circle({
    radius: obj.radius,
    fill: obj.fill,
    stroke: '#fff',
    strokeWidth: 2,
    hitStrokeWidth: 10,
  });

  const text = new Konva.Text({
    text: obj.displayNumber.toString(),
    fontSize: obj.radius,
    fontFamily: 'Inter, sans-serif',
    fill: '#fff',
    align: 'center',
    verticalAlign: 'middle',
    width: obj.radius * 2,
    height: obj.radius * 2,
    offsetX: obj.radius,
    offsetY: obj.radius,
  });

  group.add(circle);
  group.add(text);

  return group;
}
