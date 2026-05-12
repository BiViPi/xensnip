import Konva from 'konva';
import { Rect, Shape } from 'react-konva';
import { RectangleObject, AnnotationObjectPatch } from '../state/types';
import { drawCloudRect } from '../renderers/rectangleCloud';

interface RectangleNodeProps {
  obj: RectangleObject;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<any>) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
}

export function RectangleNode({ obj, isSelected, onSelect, onUpdate }: RectangleNodeProps) {
  const lineStyle = obj.lineStyle ?? 'solid';

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!isSelected) return;

    e.evt.preventDefault();
    e.cancelBubble = true;

    const delta = e.evt.deltaY < 0 ? 8 : -8;
    const nextWidth = Math.max(20, obj.width + delta);
    const nextHeight = Math.max(20, obj.height + delta);

    onUpdate(obj.id, {
      x: obj.x - (nextWidth - obj.width) / 2,
      y: obj.y - (nextHeight - obj.height) / 2,
      width: nextWidth,
      height: nextHeight,
    });
  };

  if (lineStyle === 'cloud') {
    return (
      <Shape
        id={obj.id}
        x={obj.x}
        y={obj.y}
        width={obj.width}
        height={obj.height}
        stroke={obj.stroke}
        strokeWidth={obj.strokeWidth}
        draggable={obj.draggable}
        strokeScaleEnabled={false}
        lineCap="round"
        lineJoin="round"
        sceneFunc={(context, shape) => {
          drawCloudRect(context, obj.width, obj.height);
          context.fillStrokeShape(shape);
        }}
        onClick={(e) => onSelect(obj.id, e)}
        onTap={(e) => onSelect(obj.id, e)}
        onWheel={handleWheel}
        onDragEnd={(e) => {
          onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
        }}
        name="selectable-object"
      />
    );
  }

  return (
    <Rect
      id={obj.id}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      stroke={obj.stroke}
      strokeWidth={obj.strokeWidth}
      cornerRadius={obj.cornerRadius}
      draggable={obj.draggable}
      strokeScaleEnabled={false}
      dash={lineStyle === 'dashed' ? [10, 6] : undefined}
      onClick={(e) => onSelect(obj.id, e)}
      onTap={(e) => onSelect(obj.id, e)}
      onWheel={handleWheel}
      onDragEnd={(e) => {
        onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
      }}
      name="selectable-object"
    />
  );
}
