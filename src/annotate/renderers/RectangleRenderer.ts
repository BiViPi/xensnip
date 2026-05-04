import Konva from 'konva';
import { RectangleObject } from '../state/types';
import { drawCloudRect } from './rectangleCloud';

export function createRectangleNode(obj: RectangleObject): Konva.Shape | Konva.Rect {
  const lineStyle = obj.lineStyle ?? 'solid';

  if (lineStyle === 'cloud') {
    return new Konva.Shape({
      id: obj.id,
      x: obj.x,
      y: obj.y,
      rotation: obj.rotation,
      width: obj.width,
      height: obj.height,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      draggable: obj.draggable,
      strokeScaleEnabled: false,
      lineCap: 'round',
      lineJoin: 'round',
      hitStrokeWidth: 20,
      name: 'selectable-object',
      sceneFunc: (context: Konva.Context, shape: Konva.Shape) => {
        drawCloudRect(context, obj.width, obj.height);
        context.fillStrokeShape(shape);
      },
    });
  }

  return new Konva.Rect({
    id: obj.id,
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    width: obj.width,
    height: obj.height,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    cornerRadius: obj.cornerRadius,
    draggable: obj.draggable,
    strokeScaleEnabled: false,
    dash: lineStyle === 'dashed' ? [10, 6] : undefined,
    hitStrokeWidth: 20,
    name: 'selectable-object'
  });
}
