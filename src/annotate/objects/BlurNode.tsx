import { Image } from 'react-konva';
import { BlurObject, AnnotationObjectPatch } from '../state/types';
import { useEffect, useMemo, useState } from 'react';
import Konva from 'konva';
import { getCanvasRenderScale } from '../../measure/coordinates';
import { createBlurredCanvas } from '../renderers/BlurRenderer';

interface BlurNodeProps {
  obj: BlurObject;
  onSelect: (id: string, e: Konva.KonvaEventObject<any>) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageWidth?: number;
  stageHeight?: number;
  canvasRevision?: number;
}

/**
 * BlurNode — HiDPI-aware Gaussian snapshot blur matching export rendering 1:1.
 *
 * Samples the expanded region from compositionCanvasRef using the backing canvas's
 * render scale (e.g. 1.5x or 2x on HiDPI displays) and runs the shared separable
 * premultiplied Gaussian blur without edge-bleed halos.
 */
export function BlurNode({
  obj,
  onSelect,
  onUpdate,
  compositionCanvasRef,
  stageWidth,
  stageHeight,
  canvasRevision = 0,
}: BlurNodeProps) {
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDragPos(null);
  }, [obj.x, obj.y]);

  const effectiveX = dragPos?.x ?? obj.x;
  const effectiveY = dragPos?.y ?? obj.y;

  const snapshot = useMemo(() => {
    const src = compositionCanvasRef.current;
    if (!src) return null;

    const { scaleX, scaleY } = getCanvasRenderScale(src, stageWidth, stageHeight);
    return createBlurredCanvas(
      src,
      {
        x: effectiveX * scaleX,
        y: effectiveY * scaleY,
        width: obj.width * scaleX,
        height: obj.height * scaleY,
      },
      obj.width,
      obj.height,
      obj.blurRadius
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    compositionCanvasRef,
    effectiveX,
    effectiveY,
    obj.width,
    obj.height,
    obj.blurRadius,
    stageWidth,
    stageHeight,
    canvasRevision,
  ]);

  return (
    <Image
      id={obj.id}
      x={effectiveX}
      y={effectiveY}
      rotation={obj.rotation}
      width={obj.width}
      height={obj.height}
      image={snapshot ?? undefined}
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
        onUpdate(obj.id, { x: nextX, y: nextY });
      }}
      name="selectable-object"
    />
  );
}
