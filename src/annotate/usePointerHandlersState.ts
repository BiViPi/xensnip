import { useState } from 'react';
import { DrawingObject } from './state/drawingTypes';

export function usePointerHandlersState() {
  const [drawingObject, setDrawingObject] = useState<DrawingObject | null>(null);
  return { drawingObject, setDrawingObject };
}
