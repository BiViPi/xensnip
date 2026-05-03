import { Image } from 'react-konva';
import { BlurObject } from '../state/types';
import { useEffect, useRef, useState } from 'react';
import Konva from 'konva';

interface BlurNodeProps {
  obj: BlurObject;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * BlurNode — explicit snapshot-based blur.
 * 
 * On mount and on bounds/blur change, we:
 * 1. Take a snapshot of the composition canvas region into an offscreen canvas.
 * 2. Feed the snapshot (not the live canvas) to a Konva Image node.
 * 3. Apply Konva.Filters.Blur on top of the snapshot.
 * 
 * This avoids fragile live-canvas pass-through and produces reliable on-screen blur.
 */
export function BlurNode({ obj, onSelect, onUpdate, compositionCanvasRef }: BlurNodeProps) {
  const imageRef = useRef<any>(null);
  const [snapshot, setSnapshot] = useState<HTMLCanvasElement | null>(null);

  // Rebuild snapshot whenever position/size/blurRadius changes
  useEffect(() => {
    const src = compositionCanvasRef.current;
    if (!src) return;

    // The composition canvas is drawn at its native resolution.
    // obj coords are in composition-space (unscaled), so we can sample directly.
    const snap = document.createElement('canvas');
    snap.width = Math.max(1, obj.width);
    snap.height = Math.max(1, obj.height);
    const ctx = snap.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      src,
      obj.x, obj.y, obj.width, obj.height,  // source region (composition space)
      0, 0, obj.width, obj.height            // dest (fills snapshot canvas)
    );

    setSnapshot(snap);
  }, [compositionCanvasRef, obj.x, obj.y, obj.width, obj.height]);

  // Re-cache whenever snapshot or blurRadius changes
  useEffect(() => {
    if (imageRef.current && snapshot) {
      imageRef.current.cache();
      imageRef.current.getLayer()?.batchDraw();
    }
  }, [snapshot, obj.blurRadius]);

  if (!snapshot) return null;

  return (
    <Image
      ref={imageRef}
      id={obj.id}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      image={snapshot}
      draggable={obj.draggable}
      filters={[Konva.Filters.Blur]}
      blurRadius={obj.blurRadius}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onDragEnd={(e) => {
        onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
      }}
      name="selectable-object"
    />
  );
}
