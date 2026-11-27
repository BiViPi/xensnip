import Konva from 'konva';
import { Image } from 'react-konva';
import { AnnotationObjectPatch, SimplifyUiObject } from '../state/types';
import { useEffect, useMemo, useState } from 'react';
import { createSimplifyUiCanvas } from '../renderers/SimplifyUiRenderer';
import { getCanvasRenderScale } from '../../measure/coordinates';

interface Props {
  obj: SimplifyUiObject;
  isSelected: boolean;
  stageWidth: number;
  stageHeight: number;
  canvasRevision?: number;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * SimplifyUiNode — Direction A region-scoped Auto-Skeleton / Wireframe UI annotation.
 *
 * Samples the underlying composition canvas at HiDPI render scale and generates clean
 * skeleton wireframe blocks strictly inside the region bounds with live drag preview.
 */
export function SimplifyUiNode({
  obj,
  stageWidth,
  stageHeight,
  canvasRevision = 0,
  onSelect,
  onUpdate,
  compositionCanvasRef,
}: Props) {
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
    return createSimplifyUiCanvas(
      src,
      {
        x: effectiveX * scaleX,
        y: effectiveY * scaleY,
        width: obj.width * scaleX,
        height: obj.height * scaleY,
      },
      obj.width,
      obj.height,
      {
        detailLevel: obj.detailLevel,
        blockOpacity: obj.blockOpacity,
        dimOpacity: obj.dimOpacity,
        blurRadius: obj.blurRadius,
        cornerRadius: obj.cornerRadius,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    compositionCanvasRef,
    effectiveX,
    effectiveY,
    obj.width,
    obj.height,
    obj.detailLevel,
    obj.blockOpacity,
    obj.dimOpacity,
    obj.blurRadius,
    obj.cornerRadius,
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
