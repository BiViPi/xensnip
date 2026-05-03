import { Group, Rect, Text } from 'react-konva';
import { TextObject } from '../state/types';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';

interface TextNodeProps {
  obj: TextObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
  stageScale: number;
}

export function TextNode({ obj, isSelected, onSelect, onUpdate, stageScale }: TextNodeProps) {
  const { editingTextId, setEditingTextId } = useAnnotationStore();
  const [bounds, setBounds] = useState({ width: 100, height: obj.fontSize + obj.padding * 2 });
  const textRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Tự động focus và select text khi bắt đầu edit
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Tự động mở edit khi vừa tạo (nếu text là mặc định)
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

  const handleBlur = (e: any) => {
    setEditingTextId(null);
    onUpdate(obj.id, { text: e.target.value || 'Type here...' });
  };

  const overlay = document.getElementById('annotation-ui-overlay');

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
                listening={false}
              />
            ))}
          </>
        )}
      </Group>
      {isEditing && overlay && createPortal(
        <textarea
          ref={textareaRef}
          defaultValue={obj.text}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          style={{
            position: 'absolute',
            left: `${obj.x * stageScale}px`,
            top: `${obj.y * stageScale}px`,
            width: `${bounds.width * stageScale}px`,
            minHeight: `${bounds.height * stageScale}px`,
            fontSize: `${obj.fontSize * stageScale}px`,
            fontFamily: obj.fontFamily,
            color: obj.fill,
            background: 'transparent',
            border: '1px dashed rgba(59, 130, 246, 0.5)',
            padding: `${obj.padding * stageScale}px`,
            margin: 0,
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            pointerEvents: 'auto',
            zIndex: 1001,
            lineHeight: 1.1,
            whiteSpace: 'pre',
            wordWrap: 'break-word',
            display: 'block',
          }}
        />,
        overlay
      )}
    </>
  );
}
