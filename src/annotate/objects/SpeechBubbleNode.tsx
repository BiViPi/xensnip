import Konva from 'konva';
import { Group, Path, Text, Circle } from 'react-konva';
import { SpeechBubbleObject } from '../state/types';
import { useAnnotationStore } from '../state/store';

interface SpeechBubbleNodeProps {
  obj: SpeechBubbleObject;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, attrs: Partial<SpeechBubbleObject>) => void;
}

export const SpeechBubbleNode = ({ obj, isSelected, onSelect, onUpdate }: SpeechBubbleNodeProps) => {
  const { editingTextId, setEditingTextId } = useAnnotationStore();
  const isEditing = editingTextId === obj.id;
  const { x, y, width, height, text, fontSize, fontFamily, fill, textColor, stroke, padding, cornerRadius, tailX, tailY, id, draggable } = obj;

  const getBubblePath = () => {
    const r = cornerRadius;
    const w = width;
    const h = height;
    const spread = 12;

    // Determine which side is closest to the tail tip to attach the base
    const distT = Math.abs(tailY);
    const distB = Math.abs(tailY - h);
    const distL = Math.abs(tailX);
    const distR = Math.abs(tailX - w);
    const minDist = Math.min(distT, distB, distL, distR);

    // Initial path starting at top-left corner
    let path = `M ${r},0 `;

    // Top side
    if (minDist === distT) {
      const bx = Math.max(r + spread, Math.min(w - r - spread, tailX));
      path += `L ${bx - spread},0 L ${tailX},${tailY} L ${bx + spread},0 `;
    }
    path += `L ${w - r},0 A ${r},${r} 0 0 1 ${w},${r} `;

    // Right side
    if (minDist === distR) {
      const by = Math.max(r + spread, Math.min(h - r - spread, tailY));
      path += `L ${w},${by - spread} L ${tailX},${tailY} L ${w},${by + spread} `;
    }
    path += `L ${w},${h - r} A ${r},${r} 0 0 1 ${w - r},${h} `;

    // Bottom side
    if (minDist === distB) {
      const bx = Math.max(r + spread, Math.min(w - r - spread, tailX));
      path += `L ${bx + spread},${h} L ${tailX},${tailY} L ${bx - spread},${h} `;
    }
    path += `L ${r},${h} A ${r},${r} 0 0 1 0,${h - r} `;

    // Left side
    if (minDist === distL) {
      const by = Math.max(r + spread, Math.min(h - r - spread, tailY));
      path += `L 0,${by + spread} L ${tailX},${tailY} L 0,${by - spread} `;
    }
    path += `L 0,${r} A ${r},${r} 0 0 1 ${r},0 Z`;

    return path;
  };

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
          onUpdate(id, { x: e.target.x(), y: e.target.y() });
        }
      }}
      id={id}
      name="speech_bubble"
    >
      <Path
        data={getBubblePath()}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        lineJoin="round"
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
          onDragMove={(e) => {
            e.cancelBubble = true;
            const node = e.target;
            onUpdate(id, { tailX: node.x(), tailY: node.y() });
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
