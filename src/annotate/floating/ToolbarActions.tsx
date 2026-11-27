import { Copy, Trash2 } from 'lucide-react';
import { Tooltip } from '../../editor/Tooltip';
import { useAnnotationStore } from '../state/store';
import type { AnnotateObject } from '../state/types';

export function createDuplicatedObject(
  obj: AnnotateObject,
  allObjects: AnnotateObject[],
  customId?: string
): AnnotateObject {
  const newId = customId ?? `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const clonedPoints =
    'points' in obj && Array.isArray(obj.points)
      ? ([...obj.points] as typeof obj.points)
      : undefined;

  if (obj.type === 'callout') {
    return {
      ...obj,
      id: newId,
      x: obj.x + 10,
      y: obj.y + 10,
      targetX: obj.targetX + 10,
      targetY: obj.targetY + 10,
    };
  }

  if (obj.type === 'magnify') {
    return {
      ...obj,
      id: newId,
      x: obj.x + 10,
      y: obj.y + 10,
      sourceX: obj.sourceX + 10,
      sourceY: obj.sourceY + 10,
    };
  }

  if (obj.type === 'numbered') {
    const maxNum = allObjects.reduce(
      (max, item) => (item.type === 'numbered' ? Math.max(max, item.displayNumber) : max),
      0
    );
    return {
      ...obj,
      id: newId,
      x: obj.x + 10,
      y: obj.y + 10,
      displayNumber: maxNum + 1,
    };
  }

  if (clonedPoints !== undefined) {
    return {
      ...obj,
      id: newId,
      x: obj.x + 10,
      y: obj.y + 10,
      points: clonedPoints,
    } as AnnotateObject;
  }

  return {
    ...obj,
    id: newId,
    x: obj.x + 10,
    y: obj.y + 10,
  };
}

interface ToolbarActionsProps {
  obj: AnnotateObject;
  includeLeadingDivider?: boolean;
}

export function ToolbarActions({ obj, includeLeadingDivider = true }: ToolbarActionsProps) {
  const { objects, addObject, removeObject, select } = useAnnotationStore();

  const handleDuplicate = () => {
    const duplicate = createDuplicatedObject(obj, objects);
    addObject(duplicate);
    select(duplicate.id);
  };

  return (
    <>
      {includeLeadingDivider && <div className="xs-toolbar-divider" />}
      <Tooltip text="Duplicate" position="top">
        <button
          className="xs-toolbar-btn"
          onClick={handleDuplicate}
          aria-label="Duplicate"
        >
          <Copy size={14} />
        </button>
      </Tooltip>
      <Tooltip text="Delete" position="top">
        <button
          className="xs-toolbar-btn"
          onClick={() => removeObject(obj.id)}
          aria-label="Delete"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </>
  );
}
