import Konva from 'konva';
import { Group, Arrow, Text, Rect, Circle } from 'react-konva';
import { PixelRulerObject } from '../state/types';
import { beginHistoryGesture, endHistoryGesture } from '../../editor/historyBridge';
import { getRulerLabelLayout } from '../renderers/pixelRulerLayout';

interface Props {
  obj: PixelRulerObject;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (newAttrs: Partial<PixelRulerObject>) => void;
  scale: number;
}

export function PixelRulerNode({ obj, isSelected, onSelect, onChange, scale }: Props) {
  const safeScale = scale > 0 ? scale : 1;
  const layout = getRulerLabelLayout(obj.points, undefined, safeScale);
  const fontSize = 12 / safeScale;

  const updateEndpoint = (
    endpointIndex: 0 | 1,
    nx: number,
    ny: number,
    shiftKey: boolean
  ) => {
    const otherX = endpointIndex === 0 ? obj.points[2] : obj.points[0];
    const otherY = endpointIndex === 0 ? obj.points[3] : obj.points[1];
    let snappedX = nx;
    let snappedY = ny;

    if (shiftKey) {
      if (Math.abs(nx - otherX) >= Math.abs(ny - otherY)) {
        snappedY = otherY;
      } else {
        snappedX = otherX;
      }
    }

    const nextPoints: [number, number, number, number] =
      endpointIndex === 0
        ? [snappedX, snappedY, obj.points[2], obj.points[3]]
        : [obj.points[0], obj.points[1], snappedX, snappedY];

    onChange({ points: nextPoints });
  };

  return (
    <Group
      id={obj.id}
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      draggable={obj.draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        if (e.target === e.currentTarget) {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }
      }}
      name="selectable-object"
    >
      <Arrow
        points={obj.points}
        stroke={obj.stroke}
        strokeWidth={obj.strokeWidth}
        pointerAtBeginning={true}
        pointerAtEnding={true}
        pointerLength={6 / safeScale}
        pointerWidth={6 / safeScale}
        hitStrokeWidth={20}
      />

      <Group
        x={layout.centerX}
        y={layout.centerY}
        rotation={layout.displayAngleDeg}
        listening={false}
      >
        {obj.showBackground && (
          <Rect
            x={-layout.pillWidth / 2}
            y={layout.pillOffsetY - layout.pillHeight / 2}
            width={layout.pillWidth}
            height={layout.pillHeight}
            fill="rgba(15, 23, 42, 0.78)"
            cornerRadius={layout.pillRadius}
          />
        )}
        <Text
          x={-layout.pillWidth / 2}
          y={layout.pillOffsetY - layout.pillHeight / 2}
          width={layout.pillWidth}
          height={layout.pillHeight}
          text={layout.label}
          fontSize={fontSize}
          fontFamily="sans-serif"
          fill={obj.labelFill}
          align="center"
          verticalAlign="middle"
        />
      </Group>

      {isSelected && (
        <>
          <Circle
            x={obj.points[0]}
            y={obj.points[1]}
            radius={5 / safeScale}
            fill="#6366F1"
            stroke="#ffffff"
            strokeWidth={2 / safeScale}
            hitStrokeWidth={12}
            draggable
            onDragStart={(e) => {
              e.cancelBubble = true;
              beginHistoryGesture();
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              updateEndpoint(0, e.target.x(), e.target.y(), Boolean(e.evt?.shiftKey));
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              endHistoryGesture();
            }}
          />
          <Circle
            x={obj.points[2]}
            y={obj.points[3]}
            radius={5 / safeScale}
            fill="#6366F1"
            stroke="#ffffff"
            strokeWidth={2 / safeScale}
            hitStrokeWidth={12}
            draggable
            onDragStart={(e) => {
              e.cancelBubble = true;
              beginHistoryGesture();
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              updateEndpoint(1, e.target.x(), e.target.y(), Boolean(e.evt?.shiftKey));
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              endHistoryGesture();
            }}
          />
        </>
      )}
    </Group>
  );
}
