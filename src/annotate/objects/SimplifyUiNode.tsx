import { Image, Rect } from 'react-konva';
import { AnnotationObjectPatch, SimplifyUiObject } from '../state/types';
import { useEffect, useState } from 'react';
import { createSimplifyUiOverlay } from '../renderers/SimplifyUiRenderer';

interface Props {
  obj: SimplifyUiObject;
  isSelected: boolean;
  stageWidth: number;
  stageHeight: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function SimplifyUiNode({ obj, stageWidth, stageHeight, onSelect, onUpdate, compositionCanvasRef }: Props) {
  const [overlaySnapshot, setOverlaySnapshot] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const src = compositionCanvasRef.current;
    if (!src) return;

    setOverlaySnapshot(createSimplifyUiOverlay(src, obj));
  }, [compositionCanvasRef, obj]);

  return (
    <>
      {overlaySnapshot && (
        <Image
          listening={false}
          x={0}
          y={0}
          width={stageWidth}
          height={stageHeight}
          image={overlaySnapshot}
        />
      )}
      <Rect
        id={obj.id}
        x={obj.x}
        y={obj.y}
        width={obj.width}
        height={obj.height}
        cornerRadius={obj.cornerRadius}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
        draggable={obj.draggable}
        onClick={() => onSelect(obj.id)}
        onTap={() => onSelect(obj.id)}
        onDragEnd={(e) => {
          onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
        }}
        name="selectable-object"
        hitStrokeWidth={20}
      />
    </>
  );
}
