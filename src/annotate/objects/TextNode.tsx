import { Text } from 'react-konva';
import { TextObject } from '../state/types';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TextNodeProps {
  obj: TextObject;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
  stageScale: number;
}

export function TextNode({ obj, onSelect, onUpdate, stageScale }: TextNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<any>(null);

  const handleDblClick = () => {
    setIsEditing(true);
  };

  const handleBlur = (e: any) => {
    setIsEditing(false);
    onUpdate(obj.id, { text: e.target.value });
  };

  const overlay = document.getElementById('annotation-ui-overlay');

  return (
    <>
      <Text
        ref={textRef}
        id={obj.id}
        x={obj.x}
        y={obj.y}
        text={isEditing ? '' : obj.text}
        fontSize={obj.fontSize}
        fontFamily={obj.fontFamily}
        fill={obj.fill}
        padding={obj.padding}
        draggable={obj.draggable}
        onClick={() => onSelect(obj.id)}
        onTap={() => onSelect(obj.id)}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={(e) => {
          onUpdate(obj.id, { x: e.target.x(), y: e.target.y() });
        }}
        name="selectable-object"
      />
      {isEditing && overlay && createPortal(
        <textarea
          autoFocus
          defaultValue={obj.text}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.currentTarget.blur();
            }
          }}
          style={{
            position: 'absolute',
            left: `${obj.x * stageScale}px`,
            top: `${obj.y * stageScale}px`,
            fontSize: `${obj.fontSize * stageScale}px`,
            fontFamily: obj.fontFamily,
            color: obj.fill,
            background: 'transparent',
            border: '1px solid #3b82f6',
            padding: `${obj.padding * stageScale}px`,
            margin: 0,
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            pointerEvents: 'auto',
            zIndex: 1001,
            minWidth: '100px'
          }}
        />,
        overlay
      )}
    </>
  );
}
