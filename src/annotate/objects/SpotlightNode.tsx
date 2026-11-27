import { useState } from 'react';
import Konva from 'konva';
import { Rect } from 'react-konva';
import { SpotlightObject, AnnotationObjectPatch } from '../state/types';
import { getSpotlightCornerRadius } from '../renderers/spotlightLayout';

interface SpotlightNodeProps {
  obj: SpotlightObject;
  isSelected: boolean;
  interiorInteractive?: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
  onDragPreview?: (id: string, pos: { x: number; y: number } | null) => void;
}

/**
 * Interactive hit & selection handle for a Spotlight cutout.
 * The shared dimmed backdrop is rendered by ObjectsLayer using an isolated offscreen mask canvas.
 */
export function SpotlightNode({
  obj,
  isSelected,
  interiorInteractive = true,
  onSelect,
  onUpdate,
  onDragPreview,
}: SpotlightNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
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

  const showSelectionChrome = isSelected || isHovered;

  return (
    <Rect
      id={obj.id}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      cornerRadius={cornerRadius}
      fill={interiorInteractive ? 'rgba(255,255,255,0.001)' : undefined}
      stroke={showSelectionChrome ? '#818cf8' : 'transparent'}
      strokeWidth={showSelectionChrome ? 2 : 0}
      draggable={obj.draggable}
      strokeScaleEnabled={false}
      shadowColor="#22d3ee"
      shadowBlur={showSelectionChrome ? 18 : 0}
      shadowOpacity={showSelectionChrome ? 0.28 : 0}
      hitStrokeWidth={20}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => onSelect(obj.id, e)}
      onTap={(e) => onSelect(obj.id, e)}
      onWheel={handleWheel}
      onDragMove={(e) => {
        onDragPreview?.(obj.id, { x: e.target.x(), y: e.target.y() });
      }}
      onDragEnd={(e) => {
        onDragPreview?.(obj.id, null);
        onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
      }}
      name="selectable-object"
    />
  );
}
