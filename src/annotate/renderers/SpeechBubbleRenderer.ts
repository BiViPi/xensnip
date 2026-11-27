import Konva from 'konva';
import { SpeechBubbleObject } from '../state/types';
import { buildSpeechBubblePath } from './speechBubbleGeometry';

export function createSpeechBubbleNode(obj: SpeechBubbleObject): Konva.Group {
  const group = new Konva.Group({
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
  });

  const bubble = new Konva.Path({
    data: buildSpeechBubblePath(obj.width, obj.height, obj.cornerRadius, obj.tailX, obj.tailY),
    fill: obj.fill,
    stroke: obj.stroke,
    strokeWidth: 1,
    lineJoin: 'round',
  });

  const text = new Konva.Text({
    text: obj.text,
    width: obj.width,
    height: obj.height,
    fontSize: obj.fontSize,
    fontFamily: obj.fontFamily,
    fill: obj.textColor,
    padding: obj.padding,
    align: 'center',
    verticalAlign: 'middle',
  });

  group.add(bubble);
  group.add(text);

  return group;
}
