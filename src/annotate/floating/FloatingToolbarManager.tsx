import React from 'react';
import { useAnnotationStore } from '../state/store';
import { useObjectAnchor } from './useObjectAnchor';
import './FloatingToolbar.css';
import { ArrowToolbar } from './ArrowToolbar';
import { RectangleToolbar } from './RectangleToolbar';
import { TextToolbar } from './TextToolbar';
import { BlurToolbar } from './BlurToolbar';
import { NumberedToolbar } from './NumberedToolbar';

interface Props {
  scale: number;
  stageRef: React.RefObject<any>;
}

export function FloatingToolbarManager({ scale, stageRef }: Props) {
  const { selectedId, objects } = useAnnotationStore();
  const anchor = useObjectAnchor(scale, stageRef);
  
  if (!selectedId || !anchor) return null;

  const selectedObject = objects.find(o => o.id === selectedId);
  if (!selectedObject) return null;

  if (selectedObject.type === 'arrow') {
    return <ArrowToolbar anchor={anchor} obj={selectedObject as any} />;
  }
  
  if (selectedObject.type === 'rectangle') {
    return <RectangleToolbar anchor={anchor} obj={selectedObject as any} />;
  }

  if (selectedObject.type === 'text') {
    return <TextToolbar anchor={anchor} obj={selectedObject as any} />;
  }

  if (selectedObject.type === 'blur') {
    return <BlurToolbar anchor={anchor} obj={selectedObject as any} />;
  }

  if (selectedObject.type === 'numbered') {
    return <NumberedToolbar anchor={anchor} obj={selectedObject as any} />;
  }

  return null;
}
