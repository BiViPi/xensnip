import Konva from 'konva';
import { CalloutObject } from '../state/types';

export function createCalloutNode(obj: CalloutObject): Konva.Group {
  const group = new Konva.Group({
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
  });

  const relTargetX = obj.targetX - obj.x;
  const relTargetY = obj.targetY - obj.y;

  const getAttachmentPoint = () => {
    let ax = obj.width / 2;
    let ay = obj.height / 2;
    if (relTargetX < 0) ax = 0;
    else if (relTargetX > obj.width) ax = obj.width;
    if (relTargetY < 0) ay = 0;
    else if (relTargetY > obj.height) ay = obj.height;
    return { x: ax, y: ay };
  };

  const attachment = getAttachmentPoint();

  const line = new Konva.Line({
    points: [attachment.x, attachment.y, relTargetX, relTargetY],
    stroke: obj.lineColor,
    strokeWidth: obj.lineWidth,
    lineCap: 'round',
  });

  const dot = new Konva.Circle({
    x: relTargetX,
    y: relTargetY,
    radius: obj.lineWidth * 1.5,
    fill: obj.lineColor,
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

  group.add(line);
  group.add(dot);
  group.add(body);
  group.add(text);

  return group;
}
