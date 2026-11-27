import Konva from 'konva';
import { AnnotateObject, NumberedObject } from '../state/types';

export function getNextNumberedStep(objects: ReadonlyArray<AnnotateObject>): number {
  const maxNumber = objects.reduce(
    (max, obj) => (obj.type === 'numbered' ? Math.max(max, obj.displayNumber) : max),
    0
  );
  return maxNumber + 1;
}

/**
 * Computes high-contrast foreground stroke/text ink for a Numbered badge fill using
 * perceived luminance (`L > 0.55 => dark slate #0f172a`, else white `#ffffff`).
 */
export function getContrastInkColor(hexColor: string): string {
  const normalized = hexColor.trim().replace(/^#/, '');
  let r = 0;
  let g = 0;
  let b = 0;

  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    r = parseInt(normalized[0] + normalized[0], 16);
    g = parseInt(normalized[1] + normalized[1], 16);
    b = parseInt(normalized[2] + normalized[2], 16);
  } else if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    r = parseInt(normalized.slice(0, 2), 16);
    g = parseInt(normalized.slice(2, 4), 16);
    b = parseInt(normalized.slice(4, 6), 16);
  } else {
    return '#ffffff';
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0f172a' : '#ffffff';
}

export function createNumberedNode(obj: NumberedObject): Konva.Group {
  const ink = getContrastInkColor(obj.fill);

  const group = new Konva.Group({
    id: obj.id,
    x: obj.x,
    y: obj.y,
    draggable: obj.draggable,
    name: 'selectable-object',
  });

  const circle = new Konva.Circle({
    radius: obj.radius,
    fill: obj.fill,
    stroke: ink,
    strokeWidth: 2,
    hitStrokeWidth: 12,
  });

  const text = new Konva.Text({
    text: obj.displayNumber.toString(),
    fontSize: obj.radius,
    fontFamily: 'Inter, sans-serif',
    fill: ink,
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
