import { Arrow } from 'react-konva';
import { FreehandArrowObject } from '../state/types';

interface FreehandArrowNodeProps {
  obj: FreehandArrowObject;
  onSelect: () => void;
  onUpdate: (id: string, attrs: Partial<FreehandArrowObject>) => void;
}

export const FreehandArrowNode = ({ obj, onSelect, onUpdate }: FreehandArrowNodeProps) => {
  const { x, y, points, stroke, strokeWidth, smoothing, pointerLength, pointerWidth, id, draggable } = obj;

  return (
    <Arrow
      x={x}
      y={y}
      points={points}
      stroke={stroke}
      strokeWidth={strokeWidth}
      tension={smoothing}
      pointerLength={pointerLength}
      pointerWidth={pointerWidth}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onUpdate(id, { x: e.target.x(), y: e.target.y() });
      }}
      id={id}
      name="freehand_arrow"
      lineCap="round"
      lineJoin="round"
    />
  );
};
