import { Group, Circle, Text } from 'react-konva';
import { NumberedObject } from '../state/types';

interface NumberedNodeProps {
  obj: NumberedObject;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
}

export function NumberedNode({ obj, onSelect, onUpdate }: NumberedNodeProps) {
  return (
    <Group
      id={obj.id}
      x={obj.x}
      y={obj.y}
      draggable={obj.draggable}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
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
