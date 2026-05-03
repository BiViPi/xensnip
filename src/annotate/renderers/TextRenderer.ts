import Konva from 'konva';
import { TextObject } from '../state/types';

export function createTextNode(obj: TextObject): Konva.Text {
  return new Konva.Text({
    id: obj.id,
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    text: obj.text,
    fontSize: obj.fontSize,
    fontFamily: obj.fontFamily,
    fill: obj.fill,
    padding: obj.padding,
    draggable: obj.draggable,
    hitStrokeWidth: 10,
    name: 'selectable-object'
  });
}
