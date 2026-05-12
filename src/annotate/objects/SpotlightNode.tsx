import Konva from 'konva';
import { Rect } from 'react-konva';
import { SpotlightObject, AnnotationObjectPatch } from '../state/types';
import { getSpotlightCornerRadius } from '../renderers/spotlightLayout';

interface SpotlightNodeProps {
  obj: SpotlightObject;
  isSelected: boolean;
  stageWidth: number;
  stageHeight: number;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
}

export function SpotlightNode({
  obj,
  isSelected,
  stageWidth,
  stageHeight,
  onSelect,
  onUpdate,
}: SpotlightNodeProps) {
  const cornerRadius = getSpotlightCornerRadius(obj);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!isSelected) return;

    e.evt.preventDefault();
    e.cancelBubble = true;

    const delta = e.evt.deltaY < 0 ? 8 : -8;
    const nextWidth = Math.max(40, obj.width + delta);
    const nextHeight = Math.max(40, obj.height + delta);

    onUpdate(obj.id, {
      x: obj.x - (nextWidth - obj.width) / 2,
      y: obj.y - (nextHeight - obj.height) / 2,
      width: nextWidth,
      height: nextHeight,
    });
  };

  return (
    <>
      <Rect
        listening={false}
        x={0}
        y={0}
        width={stageWidth}
        height={stageHeight}
        fill={`rgba(2, 6, 23, ${obj.opacity})`}
      />

      <Rect
        listening={false}
        x={obj.x}
        y={obj.y}
        width={obj.width}
        height={obj.height}
        cornerRadius={cornerRadius}
        fill="#000"
        globalCompositeOperation="destination-out"
      />

      <Rect
        listening={false}
        x={obj.x}
        y={obj.y}
        width={obj.width}
        height={obj.height}
        cornerRadius={cornerRadius}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1}
        shadowColor="#ffffff"
        shadowBlur={6}
        shadowOpacity={0.12}
      />

      <Rect
        id={obj.id}
        x={obj.x}
        y={obj.y}
        width={obj.width}
        height={obj.height}
        cornerRadius={cornerRadius}
        fill="rgba(255,255,255,0.001)"
        stroke="#818cf8"
        strokeWidth={2}
        draggable={obj.draggable}
        strokeScaleEnabled={false}
        shadowColor="#22d3ee"
        shadowBlur={18}
        shadowOpacity={0.28}
        hitStrokeWidth={20}
        onClick={(e) => onSelect(obj.id, e)}
        onTap={(e) => onSelect(obj.id, e)}
        onWheel={handleWheel}
        onDragEnd={(e) => {
          onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
        }}
        name="selectable-object"
      />
    </>
  );
}
