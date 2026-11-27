import Konva from 'konva';
import { Arrow } from 'react-konva';
import { FreehandArrowObject } from '../state/types';

interface FreehandArrowNodeProps {
  obj: FreehandArrowObject;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, attrs: Partial<FreehandArrowObject>) => void;
}

export const FreehandArrowNode = ({ obj, onSelect, onUpdate }: FreehandArrowNodeProps) => {
  const { x, y, points, stroke, strokeWidth, smoothing, pointerLength, pointerWidth, id, draggable } = obj;
  const showArrowhead = pointerLength > 0 && pointerWidth > 0;

  return (
    <Arrow
      x={x}
      y={y}
      rotation={obj.rotation}
      points={points}
      stroke={stroke}
      strokeWidth={strokeWidth}
      tension={smoothing}
      pointerAtEnding={showArrowhead}
      pointerLength={pointerLength}
      pointerWidth={pointerWidth}
      hitStrokeWidth={20}
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
