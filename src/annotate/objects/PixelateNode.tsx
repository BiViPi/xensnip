import Konva from 'konva';
import React, { useEffect, useState } from 'react';
import { Image } from 'react-konva';
import { PixelateObject } from '../state/types';
import { getCanvasRenderScale } from '../../measure/coordinates';
import { createPixelatedCanvas } from '../renderers/PixelateRenderer';

interface Props {
  obj: PixelateObject;
  onSelect: (id: string | null, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, attrs: Partial<PixelateObject>) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageWidth?: number;
  stageHeight?: number;
  canvasRevision?: number;
}

export function PixelateNode({
  obj,
  onSelect,
  onUpdate,
  compositionCanvasRef,
  stageWidth,
  stageHeight,
  canvasRevision = 0,
}: Props) {
  const [snapshot, setSnapshot] = useState<HTMLCanvasElement | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDragPos(null);
  }, [obj.x, obj.y]);

  const effectiveX = dragPos?.x ?? obj.x;
  const effectiveY = dragPos?.y ?? obj.y;

  useEffect(() => {
    const canvas = compositionCanvasRef.current;
    if (!canvas) return;

    const { scaleX, scaleY } = getCanvasRenderScale(canvas, stageWidth, stageHeight);
    const outCanvas = createPixelatedCanvas(
      canvas,
      {
        x: effectiveX * scaleX,
        y: effectiveY * scaleY,
        width: obj.width * scaleX,
        height: obj.height * scaleY,
      },
      obj.width,
      obj.height,
      obj.pixelSize
    );
    setSnapshot(outCanvas);
  }, [
    effectiveX,
    effectiveY,
    obj.width,
    obj.height,
    obj.pixelSize,
    compositionCanvasRef,
    stageWidth,
    stageHeight,
    canvasRevision,
  ]);

  return (
    <Image
      image={snapshot ?? undefined}
      imageSmoothingEnabled={false}
      x={effectiveX}
      y={effectiveY}
      rotation={obj.rotation}
      width={obj.width}
      height={obj.height}
      draggable={obj.draggable}
      onClick={(e) => onSelect(obj.id, e)}
      onTap={(e) => onSelect(obj.id, e)}
      hitStrokeWidth={20}
      onDragMove={(e) => {
        setDragPos({ x: e.target.x(), y: e.target.y() });
      }}
      onDragEnd={(e) => {
        const nextX = e.target.x();
        const nextY = e.target.y();
        setDragPos(null);
        onUpdate(obj.id, {
          x: nextX,
          y: nextY,
        });
      }}
      name="selectable-object"
      id={obj.id}
      stroke={obj.borderWidth > 0 ? obj.borderColor : undefined}
      strokeWidth={obj.borderWidth}
    />
  );
}
