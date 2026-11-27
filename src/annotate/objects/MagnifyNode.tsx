import Konva from 'konva';
import { Group, Image, Rect } from 'react-konva';
import { MagnifyObject, AnnotationObjectPatch } from '../state/types';
import { useEffect, useMemo, useState } from 'react';
import { getCanvasRenderScale } from '../../measure/coordinates';
import {
  computeCenteredMagnifySource,
  createMagnifySnapshotCanvas,
  syncMagnifyForDrag,
} from '../renderers/MagnifyRenderer';

interface MagnifyNodeProps {
  obj: MagnifyObject;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageWidth?: number;
  stageHeight?: number;
  canvasRevision?: number;
}

export function MagnifyNode({
  obj,
  onSelect,
  onUpdate,
  compositionCanvasRef,
  stageWidth,
  stageHeight,
  canvasRevision = 0,
}: MagnifyNodeProps) {
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDragPos(null);
  }, [obj.x, obj.y]);

  const effectiveX = dragPos?.x ?? obj.x;
  const effectiveY = dragPos?.y ?? obj.y;
  const centeredCrop = computeCenteredMagnifySource(
    effectiveX,
    effectiveY,
    obj.width,
    obj.height,
    obj.zoom
  );

  const destW = centeredCrop.sourceWidth * centeredCrop.zoom;
  const destH = centeredCrop.sourceHeight * centeredCrop.zoom;

  const snapshot = useMemo(() => {
    const src = compositionCanvasRef.current;
    if (!src) return null;

    const { scaleX, scaleY } = getCanvasRenderScale(src, stageWidth, stageHeight);
    return createMagnifySnapshotCanvas(
      src,
      {
        x: centeredCrop.sourceX * scaleX,
        y: centeredCrop.sourceY * scaleY,
        width: centeredCrop.sourceWidth * scaleX,
        height: centeredCrop.sourceHeight * scaleY,
      },
      destW * scaleX,
      destH * scaleY
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    compositionCanvasRef,
    centeredCrop.sourceX,
    centeredCrop.sourceY,
    centeredCrop.sourceWidth,
    centeredCrop.sourceHeight,
    destW,
    destH,
    stageWidth,
    stageHeight,
    canvasRevision,
  ]);

  const clippedRadius = Math.max(0, Math.min(obj.cornerRadius, obj.width / 2, obj.height / 2));

  return (
    <Group
      id={obj.id}
      x={effectiveX}
      y={effectiveY}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      draggable={obj.draggable}
      onClick={(e) => onSelect(obj.id, e)}
      onTap={(e) => onSelect(obj.id, e)}
      onDragMove={(e) => {
        setDragPos({ x: e.target.x(), y: e.target.y() });
      }}
      onDragEnd={(e) => {
        const nextX = e.target.x();
        const nextY = e.target.y();
        setDragPos(null);
        onUpdate(obj.id, syncMagnifyForDrag(obj, nextX, nextY));
      }}
      name="selectable-object"
      clipFunc={(ctx) => {
        const c = ctx as unknown as CanvasRenderingContext2D;
        c.beginPath();
        if (clippedRadius <= 0.01) {
          c.rect(0, 0, obj.width, obj.height);
        } else {
          c.moveTo(clippedRadius, 0);
          c.lineTo(obj.width - clippedRadius, 0);
          c.arcTo(obj.width, 0, obj.width, clippedRadius, clippedRadius);
          c.lineTo(obj.width, obj.height - clippedRadius);
          c.arcTo(obj.width, obj.height, obj.width - clippedRadius, obj.height, clippedRadius);
          c.lineTo(clippedRadius, obj.height);
          c.arcTo(0, obj.height, 0, obj.height - clippedRadius, clippedRadius);
          c.lineTo(0, clippedRadius);
          c.arcTo(0, 0, clippedRadius, 0, clippedRadius);
        }
        c.closePath();
      }}
    >
      <Image
        image={snapshot ?? undefined}
        x={0}
        y={0}
        width={destW}
        height={destH}
        offsetX={(destW - obj.width) / 2}
        offsetY={(destH - obj.height) / 2}
      />
      <Rect
        x={0}
        y={0}
        width={obj.width}
        height={obj.height}
        cornerRadius={clippedRadius}
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
