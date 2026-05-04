import { Arrow } from 'react-konva';
import { ArrowObject } from '../state/types';

interface ArrowNodeProps {
  obj: ArrowObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
}

export function ArrowNode({ obj, isSelected, onSelect, onUpdate }: ArrowNodeProps) {
  const handleWheel = (e: any) => {
    if (!isSelected) return;

    e.evt.preventDefault();
    e.cancelBubble = true;

    const scale = e.evt.deltaY < 0 ? 1.08 : 0.92;
    const nextDx = obj.points[2] * scale;
    const nextDy = obj.points[3] * scale;
    const nextLength = Math.hypot(nextDx, nextDy);

    if (nextLength < 20) return;

    const centerX = obj.x + obj.points[2] / 2;
    const centerY = obj.y + obj.points[3] / 2;

    onUpdate(obj.id, {
      x: centerX - nextDx / 2,
      y: centerY - nextDy / 2,
      points: [0, 0, nextDx, nextDy] as [number, number, number, number],
    });
  };

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
      onWheel={handleWheel}
      onDragEnd={(e) => {
        onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
      }}
      name="selectable-object"
    />
  );
}
