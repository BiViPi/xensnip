import Konva from 'konva';
import { Group, Circle, Text } from 'react-konva';
import { NumberedObject, AnnotationObjectPatch } from '../state/types';

interface NumberedNodeProps {
  obj: NumberedObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
}

export function NumberedNode({ obj, isSelected, onSelect, onUpdate }: NumberedNodeProps) {
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!isSelected) return;

    e.evt.preventDefault();
    e.cancelBubble = true;

    const delta = e.evt.deltaY < 0 ? 2 : -2;
    const nextRadius = Math.max(8, Math.min(48, obj.radius + delta));

    if (nextRadius !== obj.radius) {
      onUpdate(obj.id, { radius: nextRadius });
    }
  };

  return (
    <Group
      id={obj.id}
      x={obj.x}
      y={obj.y}
      draggable={obj.draggable}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onWheel={handleWheel}
      onDragEnd={(e) => {
        onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
      }}
      name="selectable-object"
    >
      <Circle
        radius={obj.radius}
        fill={obj.fill}
        stroke="#fff"
        strokeWidth={2}
      />
      <Text
        text={obj.displayNumber.toString()}
        fontSize={obj.radius}
        fontFamily="Inter, sans-serif"
        fill="#fff"
        align="center"
        verticalAlign="middle"
        width={obj.radius * 2}
        height={obj.radius * 2}
        offsetX={obj.radius}
        offsetY={obj.radius}
      />
    </Group>
  );
}
