import { Group, Rect, Text } from 'react-konva';
import { TextObject } from '../state/types';
import { useEffect, useRef, useState } from 'react';
import { useAnnotationStore } from '../state/store';

interface TextNodeProps {
  obj: TextObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
}

export function TextNode({ obj, isSelected, onSelect, onUpdate }: TextNodeProps) {
  const { editingTextId, setEditingTextId } = useAnnotationStore();
  const [bounds, setBounds] = useState({ width: 100, height: obj.fontSize + obj.padding * 2 });
  const textRef = useRef<any>(null);
  const clickAtRef = useRef(0);
  const resizeRef = useRef<{ width: number; height: number; fontSize: number } | null>(null);
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

  const openEditor = () => {
    onSelect(obj.id);
    setEditingTextId(obj.id);
  };

  const handleClick = () => {
    const now = Date.now();
    const isDoubleIntent = now - clickAtRef.current < 300;
    clickAtRef.current = now;

    if (!isSelected) {
      onSelect(obj.id);
      return;
    }

    if (isDoubleIntent) {
      openEditor();
    }
  };

  const beginResize = () => {
    resizeRef.current = {
      width: bounds.width,
      height: bounds.height,
      fontSize: obj.fontSize,
    };
  };

  const resizeFont = (e: any) => {
    const start = resizeRef.current;
    if (!start) return;

    const position = e.target.position();
    const nextWidth = Math.max(24, Math.abs(position.x));
    const nextHeight = Math.max(16, Math.abs(position.y));
    const scale = Math.max(nextWidth / start.width, nextHeight / start.height);
    const nextFontSize = Math.max(8, Math.min(96, Math.round(start.fontSize * scale)));

    onUpdate(obj.id, { fontSize: nextFontSize });
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
          <>
            <Rect
              x={0}
              y={0}
              width={bounds.width}
              height={bounds.height}
              stroke="#3b82f6"
              dash={[4, 3]}
              strokeWidth={1}
              listening={false}
            />
            {[
              { x: 0, y: 0 },
              { x: bounds.width, y: 0 },
              { x: 0, y: bounds.height },
              { x: bounds.width, y: bounds.height },
            ].map((handle, index) => (
              <Rect
                key={index}
                x={handle.x - 4}
                y={handle.y - 4}
                width={8}
                height={8}
                fill="#fff"
                stroke="#3b82f6"
                strokeWidth={1}
                cornerRadius={2}
                draggable
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                }}
                onDragStart={(e) => {
                  e.cancelBubble = true;
                  beginResize();
                }}
                onDragMove={(e) => {
                  e.cancelBubble = true;
                  resizeFont(e);
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  resizeRef.current = null;
                }}
              />
            ))}
          </>
        )}
      </Group>
    </>
  );
}
