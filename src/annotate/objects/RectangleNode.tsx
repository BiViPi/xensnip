import { Rect } from 'react-konva';
import { RectangleObject } from '../state/types';

interface RectangleNodeProps {
  obj: RectangleObject;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
}

export function RectangleNode({ obj, onSelect, onUpdate }: RectangleNodeProps) {
  return (
    <Rect
      id={obj.id}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      stroke={obj.stroke}
      strokeWidth={obj.strokeWidth}
      fill={obj.fill}
      cornerRadius={obj.cornerRadius}
      draggable={obj.draggable}
      strokeScaleEnabled={false}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onDragEnd={(e) => {
        onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
      }}
      name="selectable-object"
    />
  );
}
