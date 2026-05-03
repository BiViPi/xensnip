import { Arrow } from 'react-konva';
import { ArrowObject } from '../state/types';

interface ArrowNodeProps {
  obj: ArrowObject;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
}

export function ArrowNode({ obj, onSelect, onUpdate }: ArrowNodeProps) {
  return (
    <Arrow
      id={obj.id}
      points={obj.points}
      x={obj.x}
      y={obj.y}
      stroke={obj.stroke}
      strokeWidth={obj.strokeWidth}
      pointerLength={obj.pointerLength}
      pointerWidth={obj.pointerWidth}
      draggable={obj.draggable}
      dash={obj.style === 'dashed' ? [10, 5] : undefined}
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
