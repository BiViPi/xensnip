import { Group, Rect, Line, Text, Circle } from 'react-konva';
import { CalloutObject } from '../state/types';
import { useAnnotationStore } from '../state/store';

interface CalloutNodeProps {
  obj: CalloutObject;
  onSelect: () => void;
  onUpdate: (id: string, attrs: Partial<CalloutObject>) => void;
}

export const CalloutNode = ({ obj, onSelect, onUpdate }: CalloutNodeProps) => {
  const { editingTextId, setEditingTextId } = useAnnotationStore();
  const isEditing = editingTextId === obj.id;
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
      onDblClick={() => setEditingTextId(id)}
      onDblTap={() => setEditingTextId(id)}
      onDragEnd={(e) => {
        if (e.target === e.currentTarget) {
          const dx = e.target.x() - x;
          const dy = e.target.y() - y;
          onUpdate(id, {
            x: e.target.x(),
            y: e.target.y(),
            targetX: targetX + dx,
            targetY: targetY + dy,
          });
        }
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
      {/* Target Point Handle */}
      <Circle
        x={relTargetX}
        y={relTargetY}
        radius={lineWidth * 1.5 + 4}
        fill={lineColor}
        stroke="#fff"
        strokeWidth={2}
        draggable
        onDragMove={(e) => {
          e.cancelBubble = true;
          const node = e.target;
          onUpdate(id, {
            targetX: x + node.x(),
            targetY: y + node.y(),
          });
        }}
        onMouseEnter={(e: any) => {
          const stage = e.target.getStage();
          stage.container().style.cursor = 'move';
        }}
        onMouseLeave={(e: any) => {
          const stage = e.target.getStage();
          stage.container().style.cursor = 'default';
        }}
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
        opacity={isEditing ? 0 : 1}
        listening={false}
      />
    </Group>
  );
};
