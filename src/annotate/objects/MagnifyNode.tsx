import { Group, Image, Rect } from 'react-konva';
import { MagnifyObject, AnnotationObjectPatch } from '../state/types';
import { useEffect, useState } from 'react';

interface MagnifyNodeProps {
  obj: MagnifyObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function MagnifyNode({ obj, onSelect, onUpdate, compositionCanvasRef }: MagnifyNodeProps) {
  const [snapshot, setSnapshot] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const src = compositionCanvasRef.current;
    if (!src) return;

    const snap = document.createElement('canvas');
    snap.width = Math.max(1, obj.sourceWidth);
    snap.height = Math.max(1, obj.sourceHeight);
    const ctx = snap.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      src,
      obj.sourceX, obj.sourceY, obj.sourceWidth, obj.sourceHeight,
      0, 0, obj.sourceWidth, obj.sourceHeight
    );

    setSnapshot(snap);
  }, [compositionCanvasRef, obj.sourceX, obj.sourceY, obj.sourceWidth, obj.sourceHeight]);

  if (!snapshot) return null;

  return (
    <Group
      id={obj.id}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      draggable={obj.draggable}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onDragEnd={(e) => {
        onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
      }}
      name="selectable-object"
      clipFunc={(ctx) => {
        type CanvasWithRoundRect = CanvasRenderingContext2D & {
          roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
        };
        const ctx2 = ctx as unknown as CanvasWithRoundRect;
        if (ctx2.roundRect) {
            ctx2.beginPath();
            ctx2.roundRect(0, 0, obj.width, obj.height, obj.cornerRadius);
            ctx2.closePath();
        } else {
            ctx2.beginPath();
            ctx2.rect(0, 0, obj.width, obj.height);
            ctx2.closePath();
        }
      }}
    >
      <Image
        image={snapshot}
        x={0}
        y={0}
        width={obj.sourceWidth * obj.zoom}
        height={obj.sourceHeight * obj.zoom}
        offsetX={(obj.sourceWidth * obj.zoom - obj.width) / 2}
        offsetY={(obj.sourceHeight * obj.zoom - obj.height) / 2}
      />
      <Rect
        x={0}
        y={0}
        width={obj.width}
        height={obj.height}
        cornerRadius={obj.cornerRadius}
        stroke={`rgba(255, 255, 255, ${obj.borderOpacity})`}
        strokeWidth={2}
        shadowColor="rgba(255, 255, 255, 0.4)"
        shadowBlur={10}
        shadowOffset={{ x: 0, y: 4 }}
        hitStrokeWidth={20}
      />
    </Group>
  );
}
