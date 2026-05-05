import { Group, Arrow, Text, Rect } from 'react-konva';
import { PixelRulerObject } from '../state/types';

interface Props {
  obj: PixelRulerObject;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: Partial<PixelRulerObject>) => void;
  scale: number;
}

export function PixelRulerNode({ obj, onSelect, onChange, scale }: Props) {
  const dx = obj.points[2] - obj.points[0];
  const dy = obj.points[3] - obj.points[1];
  const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
  
  // Calculate center for the label
  const centerX = (obj.points[0] + obj.points[2]) / 2;
  const centerY = (obj.points[1] + obj.points[3]) / 2;
  
  const label = `${distance}px`;
  const fontSize = 12 / scale;
  
  // Angle for the label
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <Group
      id={obj.id}
      x={obj.x}
      y={obj.y}
      draggable={obj.draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
    >
      <Arrow
        points={obj.points}
        stroke={obj.stroke}
        strokeWidth={obj.strokeWidth}
        pointerAtBeginning={true}
        pointerAtEnding={true}
        pointerLength={6 / scale}
        pointerWidth={6 / scale}
      />
      
      <Group 
        x={centerX} 
        y={centerY}
        rotation={angle > 90 || angle < -90 ? angle + 180 : angle}
      >
        {obj.showBackground && (
          <Rect
            x={-20 / scale} // Approximate width
            y={-10 / scale} // Approximate height
            width={40 / scale}
            height={20 / scale}
            fill="rgba(0,0,0,0.6)"
            cornerRadius={4 / scale}
            offsetX={0}
            offsetY={0}
          />
        )}
        <Text
          text={label}
          fontSize={fontSize}
          fill={obj.labelFill}
          align="center"
          verticalAlign="middle"
          offsetX={0}
          offsetY={0}
          // Shift text up slightly so it's not exactly on the line
          y={-12 / scale}
          x={-20 / scale}
          width={40 / scale}
        />
      </Group>
    </Group>
  );
}
