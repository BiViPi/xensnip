import Konva from 'konva';
import { Group, Path, Text, Circle } from 'react-konva';
import { SpeechBubbleObject } from '../state/types';
import { useAnnotationStore } from '../state/store';
import { beginHistoryGesture, endHistoryGesture } from '../../editor/historyBridge';
import { buildSpeechBubblePath } from '../renderers/speechBubbleGeometry';

interface SpeechBubbleNodeProps {
  obj: SpeechBubbleObject;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, attrs: Partial<SpeechBubbleObject>) => void;
}

export const SpeechBubbleNode = ({ obj, isSelected, onSelect, onUpdate }: SpeechBubbleNodeProps) => {
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
    tailX,
    tailY,
    id,
    draggable,
  } = obj;

  const bubblePath = buildSpeechBubblePath(width, height, cornerRadius, tailX, tailY);

  return (
    <Group
      x={x}
      y={y}
      rotation={obj.rotation}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={() => setEditingTextId(id)}
      onDblTap={() => setEditingTextId(id)}
      onDragEnd={(e) => {
        if (e.target === e.currentTarget) {
          onUpdate(id, { x: e.target.x(), y: e.target.y() });
        }
      }}
      id={id}
      name="speech_bubble"
    >
      <Path
        data={bubblePath}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        lineJoin="round"
        hitStrokeWidth={12}
      />
      {/* Text Content */}
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
      {/* Tail Handle */}
      {isSelected && (
        <Circle
          x={tailX}
          y={tailY}
          radius={6}
          fill="#6366F1"
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
            onUpdate(id, { tailX: node.x(), tailY: node.y() });
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
      )}
    </Group>
  );
};
