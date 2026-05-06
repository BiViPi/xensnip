import { Group, Rect, Path, Text } from 'react-konva';
import { SpeechBubbleObject } from '../state/types';

interface SpeechBubbleNodeProps {
  obj: SpeechBubbleObject;
  onSelect: () => void;
  onUpdate: (id: string, attrs: Partial<SpeechBubbleObject>) => void;
}

export const SpeechBubbleNode = ({ obj, onSelect, onUpdate }: SpeechBubbleNodeProps) => {
  const { x, y, width, height, text, fontSize, fontFamily, fill, textColor, stroke, padding, cornerRadius, tailSide, tailOffset, tailLength, id, draggable } = obj;

  const getTailPoints = () => {
    const offset = tailOffset * (tailSide === 'top' || tailSide === 'bottom' ? width : height);
    const halfTailWidth = 10; // Width of the tail base

    switch (tailSide) {
      case 'top':
        return `M ${offset - halfTailWidth} ${0} L ${offset} ${-tailLength} L ${offset + halfTailWidth} ${0} Z`;
      case 'bottom':
        return `M ${offset - halfTailWidth} ${height} L ${offset} ${height + tailLength} L ${offset + halfTailWidth} ${height} Z`;
      case 'left':
        return `M ${0} ${offset - halfTailWidth} L ${-tailLength} ${offset} L ${0} ${offset + halfTailWidth} Z`;
      case 'right':
        return `M ${width} ${offset - halfTailWidth} L ${width + tailLength} ${offset} L ${width} ${offset + halfTailWidth} Z`;
      default:
        return '';
    }
  };

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onUpdate(id, { x: e.target.x(), y: e.target.y() });
      }}
      id={id}
      name="speech_bubble"
    >
      {/* Tail */}
      <Path
        data={getTailPoints()}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        lineJoin="round"
      />
      {/* Body */}
      <Rect
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        cornerRadius={cornerRadius}
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
        listening={false}
      />
    </Group>
  );
};
