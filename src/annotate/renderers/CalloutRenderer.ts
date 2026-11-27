import Konva from 'konva';
import { CalloutObject } from '../state/types';
import { getCalloutAttachmentPoint } from './calloutGeometry';

export function createCalloutNode(obj: CalloutObject): Konva.Group {
  const group = new Konva.Group({
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
  });

  const relTargetX = obj.targetX - obj.x;
  const relTargetY = obj.targetY - obj.y;
  const attachment = getCalloutAttachmentPoint(obj.width, obj.height, relTargetX, relTargetY);
  const clippedRadius = Math.max(0, Math.min(obj.cornerRadius, obj.width / 2, obj.height / 2));

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
    cornerRadius: clippedRadius,
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
