import Konva from 'konva';
import React, { useEffect, useState } from 'react';
import { Image } from 'react-konva';
import { PixelateObject } from '../state/types';

interface Props {
  obj: PixelateObject;
  onSelect: (id: string | null, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, attrs: Partial<PixelateObject>) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function PixelateNode({ obj, onSelect, onUpdate, compositionCanvasRef }: Props) {
  const [snapshot, setSnapshot] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = compositionCanvasRef.current;
    if (!canvas) return;

    // 1. Snapshot the source region
    const snap = document.createElement('canvas');
    snap.width = Math.max(1, obj.width);
    snap.height = Math.max(1, obj.height);
    const snapCtx = snap.getContext('2d');
    if (!snapCtx) return;

    snapCtx.drawImage(
      canvas,
      obj.x, obj.y, obj.width, obj.height,
      0, 0, obj.width, obj.height
    );

    // 2. Downscale to pixel-block grid
    const pixelSize = Math.max(1, obj.pixelSize);
    const bw = Math.max(1, Math.ceil(obj.width / pixelSize));
    const bh = Math.max(1, Math.ceil(obj.height / pixelSize));
    
    const blockCanvas = document.createElement('canvas');
    blockCanvas.width = bw;
    blockCanvas.height = bh;
    const blockCtx = blockCanvas.getContext('2d');
    if (!blockCtx) return;
    
    blockCtx.imageSmoothingEnabled = false;
    blockCtx.drawImage(snap, 0, 0, bw, bh);

    // 3. Upscale back with hard edges
    const outCanvas = document.createElement('canvas');
    outCanvas.width = obj.width;
    outCanvas.height = obj.height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;
    
    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(blockCanvas, 0, 0, bw, bh, 0, 0, obj.width, obj.height);

    setSnapshot(outCanvas);
  }, [obj.x, obj.y, obj.width, obj.height, obj.pixelSize, compositionCanvasRef]);

  return (
    <Image
      image={snapshot ?? undefined}
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      width={obj.width}
      height={obj.height}
      draggable={obj.draggable}
      onClick={(e) => onSelect(obj.id, e)}
      onTap={(e) => onSelect(obj.id, e)}
      onDragEnd={(e) => {
        onUpdate(obj.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      name="object"
      id={obj.id}
      stroke={obj.borderWidth > 0 ? obj.borderColor : undefined}
      strokeWidth={obj.borderWidth}
    />
  );
}
