import Konva from 'konva';
import { Group, Rect, Text } from 'react-konva';
import { TextObject, AnnotationObjectPatch } from '../state/types';
import { useEffect, useRef, useState } from 'react';
import { useAnnotationStore } from '../state/store';

interface TextNodeProps {
  obj: TextObject;
  isSelected: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<any>) => void;
  onUpdate: (id: string, patch: AnnotationObjectPatch) => void;
}

export function TextNode({ obj, isSelected, onSelect, onUpdate }: TextNodeProps) {
  const { editingTextId, setEditingTextId } = useAnnotationStore();
  const [bounds, setBounds] = useState({ width: 100, height: obj.fontSize + obj.padding * 2 });
  const textRef = useRef<Konva.Text>(null);
  const clickAtRef = useRef(0);
  const isEditing = editingTextId === obj.id;

  useEffect(() => {
    if (!textRef.current) return;

    const box = textRef.current.getClientRect({ skipTransform: true, skipShadow: true, skipStroke: true });
    setBounds({
      width: Math.max(100, Math.ceil(box.width)),
      height: Math.max(obj.fontSize + obj.padding * 2, Math.ceil(box.height)),
    });
  }, [obj.text, obj.fontSize, obj.fontFamily, obj.padding]);

  useEffect(() => {
    if (!isSelected && isEditing) {
      setEditingTextId(null);
    }
  }, [isSelected, isEditing, setEditingTextId]);

  const openEditor = (e?: Konva.KonvaEventObject<any>) => {
    if (e) onSelect(obj.id, e);
    setEditingTextId(obj.id);
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!isSelected || isEditing) return;

    e.evt.preventDefault();
    e.cancelBubble = true;

    const delta = e.evt.deltaY < 0 ? 2 : -2;
    const nextFontSize = Math.max(8, Math.min(96, obj.fontSize + delta));

    if (nextFontSize !== obj.fontSize) {
      onUpdate(obj.id, { fontSize: nextFontSize });
    }
  };

  const handleClick = (e: Konva.KonvaEventObject<any>) => {
    const now = Date.now();
    const isDoubleIntent = now - clickAtRef.current < 300;
    clickAtRef.current = now;

    if (!isSelected || e.evt.ctrlKey || e.evt.metaKey) {
      onSelect(obj.id, e);
      return;
    }

    if (isDoubleIntent) {
      openEditor();
    }
  };

  return (
    <>
      <Group
        id={obj.id}
        x={obj.x}
        y={obj.y}
        draggable={obj.draggable && !isEditing}
        onClick={handleClick}
        onTap={handleClick}
        onDblClick={openEditor}
        onDblTap={openEditor}
        onWheel={handleWheel}
        onDragEnd={(e) => {
          onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
        }}
        name="selectable-object"
      >
        <Rect
          width={bounds.width}
          height={bounds.height}
          fill="rgba(0,0,0,0.001)"
        />
        <Text
          ref={textRef}
          x={0}
          y={0}
          text={obj.text}
          fontSize={obj.fontSize}
          fontFamily={obj.fontFamily}
          fill={obj.fill}
          padding={obj.padding}
          opacity={isEditing ? 0 : 1}
          listening={false}
        />
        {isSelected && !isEditing && (
          <Rect
            x={0}
            y={0}
            width={bounds.width}
            height={bounds.height}
            stroke="#6366F1"
            dash={[4, 3]}
            strokeWidth={1}
            listening={false}
          />
        )}
      </Group>
    </>
  );
}
