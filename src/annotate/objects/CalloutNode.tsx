import { Group, Rect, Line, Text, Circle } from 'react-konva';
import { CalloutObject } from '../state/types';

interface CalloutNodeProps {
  obj: CalloutObject;
  onSelect: () => void;
  onUpdate: (id: string, attrs: Partial<CalloutObject>) => void;
}

export const CalloutNode = ({ obj, onSelect, onUpdate }: CalloutNodeProps) => {
  const { x, y, width, height, text, fontSize, fontFamily, fill, textColor, stroke, padding, cornerRadius, targetX, targetY, lineColor, lineWidth, id, draggable } = obj;

  // Relative coordinates for the leader line
  const relTargetX = targetX - x;
  const relTargetY = targetY - y;

  // Logic to find the attachment point on the label box boundary
  const getAttachmentPoint = () => {
    let ax = width / 2;
    let ay = height / 2;

    if (relTargetX < 0) ax = 0;
    else if (relTargetX > width) ax = width;
    
    if (relTargetY < 0) ay = 0;
    else if (relTargetY > height) ay = height;

    return { x: ax, y: ay };
  };

  const attachment = getAttachmentPoint();

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const dx = e.target.x() - x;
        const dy = e.target.y() - y;
        onUpdate(id, {
          x: e.target.x(),
          y: e.target.y(),
          targetX: targetX + dx,
          targetY: targetY + dy,
        });
      }}
      id={id}
      name="callout"
    >
      {/* Leader Line */}
      <Line
        points={[attachment.x, attachment.y, relTargetX, relTargetY]}
        stroke={lineColor}
        strokeWidth={lineWidth}
        lineCap="round"
      />
      {/* Target Point Dot */}
      <Circle
        x={relTargetX}
        y={relTargetY}
        radius={lineWidth * 1.5}
        fill={lineColor}
      />
      {/* Label Box */}
      <Rect
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        cornerRadius={cornerRadius}
      />
      {/* Label Text */}
      <Text
        text={text}
        width={width}
        height={height}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill={textColor}
        padding={padding}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  );
};
