import { useEffect, useState } from 'react';
import Konva from 'konva';
import { Group, Rect, Line, Text, Circle } from 'react-konva';
import { CalloutObject } from '../state/types';
import { useAnnotationStore } from '../state/store';
import { beginHistoryGesture, endHistoryGesture } from '../../editor/historyBridge';
import { getCalloutAttachmentPoint } from '../renderers/calloutGeometry';

interface CalloutNodeProps {
  obj: CalloutObject;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, attrs: Partial<CalloutObject>) => void;
}

export const CalloutNode = ({ obj, onSelect, onUpdate }: CalloutNodeProps) => {
  const { editingTextId, setEditingTextId } = useAnnotationStore();
  const isEditing = editingTextId === obj.id;
  const {
    x,
    y,
    width,
    height,
    text,
    fontSize,
    fontFamily,
    fill,
    textColor,
    stroke,
    padding,
    cornerRadius,
    targetX,
    targetY,
    lineColor,
    lineWidth,
    id,
    draggable,
  } = obj;

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDragPos(null);
  }, [x, y]);

  const effectiveX = dragPos?.x ?? x;
  const effectiveY = dragPos?.y ?? y;
  const relTargetX = targetX - effectiveX;
  const relTargetY = targetY - effectiveY;
  const attachment = getCalloutAttachmentPoint(width, height, relTargetX, relTargetY);
  const clippedRadius = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));

  return (
    <Group
      x={effectiveX}
      y={effectiveY}
      rotation={obj.rotation}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={() => setEditingTextId(id)}
      onDblTap={() => setEditingTextId(id)}
      onDragMove={(e) => {
        if (e.target === e.currentTarget) {
          setDragPos({ x: e.target.x(), y: e.target.y() });
        }
      }}
      onDragEnd={(e) => {
        if (e.target === e.currentTarget) {
          const nextX = e.target.x();
          const nextY = e.target.y();
          setDragPos(null);
          // Pin targetX/targetY fixed in canvas space when repositioning the label box
          onUpdate(id, { x: nextX, y: nextY });
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
        hitStrokeWidth={16}
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
        onDragStart={(e) => {
          e.cancelBubble = true;
          beginHistoryGesture();
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const node = e.target;
          onUpdate(id, {
            targetX: effectiveX + node.x(),
            targetY: effectiveY + node.y(),
          });
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          endHistoryGesture();
        }}
        onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'move';
        }}
        onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />
      {/* Label Box */}
      <Rect
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        cornerRadius={clippedRadius}
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
