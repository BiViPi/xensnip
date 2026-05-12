import Konva from 'konva';
import { Rect } from 'react-konva';
import { OpaqueRedactObject } from '../state/types';

interface Props {
  obj: OpaqueRedactObject;
  onSelect: (id: string | null, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onUpdate: (id: string, attrs: Partial<OpaqueRedactObject>) => void;
}

export function OpaqueRedactNode({ obj, onSelect, onUpdate }: Props) {
  return (
    <Rect
      id={obj.id}
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      width={obj.width}
      height={obj.height}
      fill={obj.fill}
      stroke={obj.borderColor}
      strokeWidth={obj.borderWidth}
      cornerRadius={0}
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
    />
  );
}
