import { Image } from 'react-konva';
import { BlurObject } from '../state/types';
import { useEffect, useRef } from 'react';
import Konva from 'konva';

interface BlurNodeProps {
  obj: BlurObject;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function BlurNode({ obj, onSelect, onUpdate, compositionCanvasRef }: BlurNodeProps) {
  const imageRef = useRef<any>(null);

  useEffect(() => {
    if (imageRef.current) {
      // We must cache to apply filters in Konva
      imageRef.current.cache();
    }
  }, [obj.x, obj.y, obj.width, obj.height, obj.blurRadius]);

  const canvas = compositionCanvasRef.current;
  if (!canvas) return null;

  return (
    <Image
      ref={imageRef}
      id={obj.id}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      image={canvas}
      crop={{
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height
      }}
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
