import { useCallback } from 'react';
import Konva from 'konva';
import { useAnnotationStore } from './state/store';
import { getCompositionCoordinates } from '../measure/coordinates';
import { DrawingObject } from './state/drawingTypes';
import { TOOL_TO_DRAW_TYPE } from './drawingTypeMap';
import {
  createImmediateText,
  createImmediateNumbered,
  createImmediateSpeechBubble,
} from './immediateObjectFactory';
import { usePointerHandlersState } from './usePointerHandlersState';
import { getPointerCoords } from './pointer/pointerCoordinates';
import {
  computeFreehandPathLength,
  shouldAddFreehandPoint,
  FREEHAND_MIN_PATH_LENGTH,
} from './pointer/freehandArrowPointer';
import { createDragAnnotationObject } from './pointer/dragObjectFactory';
import {
  beginOcrSelection,
  completeOcrSelection,
} from './pointer/ocrSelectionHandlers';
import {
  beginSmartRedactSelection,
  completeSmartRedactSelection,
} from './pointer/smartRedactSelectionHandlers';
import { FreehandArrowObject } from './state/types';

interface UseAnnotationPointerHandlersDeps {
  scale: number;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  // measure store setters
  setCurrentSample: (sample: { x: number; y: number; rgb: [number, number, number]; hex: string } | null) => void;
  colorPickerFrozen: boolean;
  setColorPickerFrozen: (frozen: boolean) => void;
  setOcrRegion: (region: { x: number; y: number; width: number; height: number } | null) => void;
  setOcrStatus: (status: 'idle' | 'selecting' | 'running' | 'ready' | 'error') => void;
  setOcrText: (text: string) => void;
  setOcrError: (error: string | null) => void;
  ocrRequestIdRef: React.RefObject<number>;
  // privacy store setters
  setPrivacyStatus: (status: 'idle' | 'ready' | 'error' | 'detecting') => void;
  setSelectionRect: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  setScope: (scope: 'full_canvas' | 'selection') => void;
  resetPrivacy: () => void;
  // active state
  activeUtility: string | null;
}

export function useAnnotationPointerHandlers(deps: UseAnnotationPointerHandlersDeps): {
  handleMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleMouseUp: () => void;
  drawingObject: DrawingObject | null;
} {
  const {
    scale,
    compositionCanvasRef,
    setCurrentSample,
    colorPickerFrozen,
    setColorPickerFrozen,
    setOcrRegion,
    setOcrStatus,
    setOcrText,
    setOcrError,
    ocrRequestIdRef,
    setPrivacyStatus,
    setSelectionRect,
    setScope,
    resetPrivacy,
    activeUtility,
  } = deps;

  const { activeTool, select, addObject, setActiveTool, objects, setEditingTextId } =
    useAnnotationStore();

  const { drawingObject, setDrawingObject } = usePointerHandlersState();

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const coords = getPointerCoords(e, scale);
      if (!coords) return;
      const { stageX, stageY } = coords;

      // 1. Utility logic
      if (activeUtility === 'color_picker') {
        setColorPickerFrozen(!colorPickerFrozen);
        return;
      }

      if (activeUtility === 'ocr_extract') {
        setDrawingObject(
          beginOcrSelection(stageX, stageY, {
            setOcrRegion,
            setOcrStatus,
            setOcrText,
            setOcrError,
          })
        );
        return;
      }

      if (activeUtility === 'smart_redact_ai') {
        setDrawingObject(
          beginSmartRedactSelection(stageX, stageY, {
            resetPrivacy,
            setPrivacyStatus,
          })
        );
        return;
      }

      // 2. Immediate object creation
      if (activeTool === 'text') {
        const text = createImmediateText(stageX, stageY);
        addObject(text);
        select(text.id);
        setEditingTextId(text.id);
        setActiveTool('select');
        return;
      }

      if (activeTool === 'numbered') {
        const count = objects.filter((o) => o.type === 'numbered').length;
        const numbered = createImmediateNumbered(stageX, stageY, count);
        addObject(numbered);
        select(numbered.id);
        setActiveTool('select');
        return;
      }

      if (activeTool === 'speech_bubble') {
        const bubble = createImmediateSpeechBubble(stageX, stageY);
        addObject(bubble);
        select(bubble.id);
        setEditingTextId(bubble.id);
        setActiveTool('select');
        return;
      }

      // 3. Drag-to-create objects
      const drawType = TOOL_TO_DRAW_TYPE[activeTool];
      if (drawType) {
        if (drawType === 'freehand_arrow') {
          setDrawingObject({
            type: 'freehand_arrow',
            start: { x: stageX, y: stageY },
            points: [0, 0],
          });
        } else {
          setDrawingObject({
            type: drawType,
            start: { x: stageX, y: stageY },
            end: { x: stageX, y: stageY },
          });
        }
        return;
      }

      // 4. Fallback: deselect on empty stage click
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty && activeTool === 'select') {
        select(null);
        setEditingTextId(null);
      }
    },
    [
      scale, activeUtility, activeTool, objects, colorPickerFrozen, setColorPickerFrozen,
      setOcrRegion, setOcrText, setOcrError, setOcrStatus, resetPrivacy, setPrivacyStatus,
      addObject, select, setEditingTextId, setActiveTool, setDrawingObject,
    ]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const coords = getPointerCoords(e, scale);
      if (!coords) return;
      const { stageX, stageY } = coords;

      if (activeUtility === 'color_picker' && !colorPickerFrozen) {
        const canvas = compositionCanvasRef.current;
        if (canvas) {
          const { x, y } = getCompositionCoordinates(stageX, stageY, canvas.width, canvas.height);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
            setCurrentSample({ x: stageX, y: stageY, rgb: [pixel[0], pixel[1], pixel[2]], hex });
          }
        }
      }

      if (!drawingObject) return;

      if (drawingObject.type === 'freehand_arrow') {
        const dx = stageX - drawingObject.start.x;
        const dy = stageY - drawingObject.start.y;
        if (shouldAddFreehandPoint(drawingObject.points, dx, dy)) {
          setDrawingObject({ ...drawingObject, points: [...drawingObject.points, dx, dy] });
        }
        return;
      }

      let endX = stageX;
      let endY = stageY;

      if (e.evt?.shiftKey && (drawingObject.type === 'pixel_ruler' || drawingObject.type === 'arrow')) {
        const dx = Math.abs(stageX - drawingObject.start.x);
        const dy = Math.abs(stageY - drawingObject.start.y);
        if (dx > dy) endY = drawingObject.start.y;
        else endX = drawingObject.start.x;
      }

      setDrawingObject({ ...drawingObject, end: { x: endX, y: endY } });
    },
    [scale, activeUtility, colorPickerFrozen, compositionCanvasRef, setCurrentSample, drawingObject, setDrawingObject]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawingObject) return;

    // Freehand arrow — uses accumulated points array
    if (drawingObject.type === 'freehand_arrow') {
      if (computeFreehandPathLength(drawingObject.points) > FREEHAND_MIN_PATH_LENGTH) {
        const newId = `obj-${Date.now()}`;
        const arrow: FreehandArrowObject = {
          id: newId,
          type: 'freehand_arrow',
          x: drawingObject.start.x, y: drawingObject.start.y, rotation: 0,
          points: drawingObject.points, stroke: '#ef4444', strokeWidth: 4,
          smoothing: 0.5, pointerLength: 12, pointerWidth: 12, draggable: true,
        };
        addObject(arrow);
        select(newId);
        setActiveTool('select');
      }
      setDrawingObject(null);
      return;
    }

    const dx = drawingObject.end.x - drawingObject.start.x;
    const dy = drawingObject.end.y - drawingObject.start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // OCR selection
    if (drawingObject.type === 'ocr_selection') {
      completeOcrSelection(drawingObject, {
        compositionCanvas: compositionCanvasRef.current,
        setOcrRegion,
        setOcrStatus,
        setOcrText,
        setOcrError,
        ocrRequestIdRef,
      });
      setDrawingObject(null);
      return;
    }

    // Smart Redact selection
    if (drawingObject.type === 'smart_redact_selection') {
      completeSmartRedactSelection(drawingObject, {
        setPrivacyStatus,
        setSelectionRect,
        setScope,
      });
      setDrawingObject(null);
      return;
    }

    // Regular drag shapes — minimum size check
    if (dist > 4) {
      const newId = `obj-${Date.now()}`;
      const obj = createDragAnnotationObject(drawingObject.type, drawingObject.start, drawingObject.end, newId);
      if (obj) {
        addObject(obj);
        if (obj.type === 'callout') {
          setEditingTextId(newId);
        }
        select(newId);
        setActiveTool('select');
      }
    }
    setDrawingObject(null);
  }, [
    drawingObject, setDrawingObject, compositionCanvasRef, addObject, select, setActiveTool, setEditingTextId,
    setOcrRegion, setOcrStatus, setOcrText, setOcrError, ocrRequestIdRef, setScope, setSelectionRect, setPrivacyStatus,
  ]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, drawingObject };
}
