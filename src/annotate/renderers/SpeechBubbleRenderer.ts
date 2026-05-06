import Konva from 'konva';
import { SpeechBubbleObject } from '../state/types';

export function createSpeechBubbleNode(obj: SpeechBubbleObject): Konva.Group {
  const group = new Konva.Group({
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
  });

  const getTailPoints = () => {
    const offset = obj.tailOffset * (obj.tailSide === 'top' || obj.tailSide === 'bottom' ? obj.width : obj.height);
    const halfTailWidth = 10;

    switch (obj.tailSide) {
      case 'top':
        return [offset - halfTailWidth, 0, offset, -obj.tailLength, offset + halfTailWidth, 0];
      case 'bottom':
        return [offset - halfTailWidth, obj.height, offset, obj.height + obj.tailLength, offset + halfTailWidth, obj.height];
      case 'left':
        return [0, offset - halfTailWidth, -obj.tailLength, offset, 0, offset + halfTailWidth];
      case 'right':
        return [obj.width, offset - halfTailWidth, obj.width + obj.tailLength, offset, obj.width, offset + halfTailWidth];
      default:
        return [];
    }
  };

  const tail = new Konva.Line({
    points: getTailPoints(),
    fill: obj.fill,
    stroke: obj.stroke,
    strokeWidth: 1,
    closed: true,
    lineJoin: 'round',
  });

  const body = new Konva.Rect({
    width: obj.width,
    height: obj.height,
    fill: obj.fill,
    stroke: obj.stroke,
    strokeWidth: 1,
    cornerRadius: obj.cornerRadius,
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

  group.add(tail);
  group.add(body);
  group.add(text);

  return group;
}
