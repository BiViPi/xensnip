import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Move } from 'lucide-react';
import { beginHistoryGesture, endHistoryGesture } from '../../editor/historyBridge';
import { useAnnotationStore } from '../state/store';
import type { AnnotateObject } from '../state/types';

interface MoveHandleBadgeProps {
  anchor: { left: number; top: number; width: number; height: number };
  scale: number;
  objects: AnnotateObject[];
}

interface DragOrigin {
  id: string;
  type: AnnotateObject['type'];
  x: number;
  y: number;
  sourceX?: number;
  sourceY?: number;
}

export function MoveHandleBadge({ anchor, scale, objects }: MoveHandleBadgeProps) {
  const updateObject = useAnnotationStore((s) => s.updateObject);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const beginDrag = useCallback(
    (startX: number, startY: number, mode: 'pointer' | 'mouse') => {
      if (cleanupRef.current || objects.length === 0) return;

      const safeScale = scale > 0 ? scale : 1;
      const origins: DragOrigin[] = objects.map((obj) => ({
        id: obj.id,
        type: obj.type,
        x: obj.x,
        y: obj.y,
        ...(obj.type === 'magnify' ? { sourceX: obj.sourceX, sourceY: obj.sourceY } : {}),
      }));

      beginHistoryGesture();
      const previousCursor = document.body.style.cursor;
      document.body.style.cursor = 'move';

      const onMove = (ev: MouseEvent | PointerEvent) => {
        const dx = (ev.clientX - startX) / safeScale;
        const dy = (ev.clientY - startY) / safeScale;
        if (dx === 0 && dy === 0) return;

        for (const origin of origins) {
          if (origin.type === 'magnify' && origin.sourceX !== undefined && origin.sourceY !== undefined) {
            updateObject(origin.id, {
              x: origin.x + dx,
              y: origin.y + dy,
              sourceX: origin.sourceX + dx,
              sourceY: origin.sourceY + dy,
            });
          } else {
            updateObject(origin.id, {
              x: origin.x + dx,
              y: origin.y + dy,
            });
          }
        }
      };

      const finish = () => {
        if (mode === 'pointer') {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', finish);
          window.removeEventListener('pointercancel', finish);
        } else {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', finish);
        }
        document.body.style.cursor = previousCursor;
        cleanupRef.current = null;
        endHistoryGesture();
      };

      cleanupRef.current = finish;
      if (mode === 'pointer') {
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);
      } else {
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', finish);
      }
    },
    [objects, scale, updateObject]
  );

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay || objects.length === 0) return null;

  const rawLeft = anchor.left + anchor.width / 2;
  const rawTop = anchor.top + anchor.height + 8;
  const left = overlay.clientWidth > 36
    ? Math.max(18, Math.min(overlay.clientWidth - 18, rawLeft))
    : rawLeft;
  const top = overlay.clientHeight > 40
    ? Math.min(overlay.clientHeight - 34, rawTop)
    : rawTop;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    beginDrag(e.clientX, e.clientY, 'pointer');
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    beginDrag(e.clientX, e.clientY, 'mouse');
  };

  return createPortal(
    <button
      type="button"
      className="xs-move-handle-badge"
      aria-label="Drag to move"
      title="Drag to move"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateX(-50%)',
      }}
      onPointerDown={handlePointerDown}
      onMouseDown={handleMouseDown}
    >
      <Move size={14} />
    </button>,
    overlay
  );
}
