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
import { AnnotateObject, FreehandArrowObject, ToolId } from './state/types';

const REPEATABLE_TOOLS = new Set<ToolId>([
  'arrow',
  'rectangle',
  'numbered',
  'blur',
  'pixelate',
  'opaque_redact',
  'spotlight',
  'simplify_ui',
  'magnify',
  'pixel_ruler',
  'callout',
  'freehand_arrow',
]);

interface UseAnnotationPointerHandlersDeps {
  scale: number;
  stageRef: React.RefObject<Konva.Stage | null>;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  // measure store setters
  setCurrentSample: (sample: { x: number; y: number; rgb: [number, number, number]; hex: string } | null) => void;
  colorPickerFrozen: boolean;
  setColorPickerFrozen: (frozen: boolean) => void;
  setOcrRegion: (region: { x: number; y: number; width: number; height: number } | null) => void;
  setOcrStatus: (status: 'idle' | 'selecting' | 'loading' | 'running' | 'ready' | 'error') => void;
  setOcrProgress: (progress: number) => void;
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
  handleMouseUp: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  drawingObject: DrawingObject | null;
} {
  const {
    scale,
    stageRef,
    compositionCanvasRef,
    setCurrentSample,
    colorPickerFrozen,
    setColorPickerFrozen,
    setOcrRegion,
    setOcrStatus,
    setOcrProgress,
    setOcrText,
    setOcrError,
    ocrRequestIdRef,
    setPrivacyStatus,
    setSelectionRect,
    setScope,
    resetPrivacy,
    activeUtility,
  } = deps;

  const { activeTool, select, selectMultiple, selectAdditive, addObject, setActiveTool, objects, setEditingTextId } =
    useAnnotationStore();

  const { drawingObject, setDrawingObject } = usePointerHandlersState();

  const getObjectBounds = useCallback(
    (obj: AnnotateObject): { minX: number; minY: number; maxX: number; maxY: number } => {
      const stage = stageRef.current;
      if (stage) {
        const node = stage.findOne(`#${obj.id}`);
        if (node) {
          const rect = node.getClientRect({ skipShadow: true, relativeTo: stage });
          return {
            minX: rect.x,
            minY: rect.y,
            maxX: rect.x + rect.width,
            maxY: rect.y + rect.height,
          };
        }
      }

      const { x, y } = obj;
      switch (obj.type) {
        case 'arrow':
        case 'pixel_ruler': {
          const p = obj.points;
          return {
            minX: x + Math.min(p[0], p[2]),
            minY: y + Math.min(p[1], p[3]),
            maxX: x + Math.max(p[0], p[2]),
            maxY: y + Math.max(p[1], p[3]),
          };
        }
        case 'freehand_arrow': {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (let i = 0; i < obj.points.length; i += 2) {
            minX = Math.min(minX, x + obj.points[i]);
            maxX = Math.max(maxX, x + obj.points[i]);
            minY = Math.min(minY, y + obj.points[i + 1]);
            maxY = Math.max(maxY, y + obj.points[i + 1]);
          }
          return { minX, minY, maxX, maxY };
        }
        case 'numbered': {
          const r = obj.radius;
          return { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r };
        }
        case 'text': {
          const approxWidth = Math.max(100, obj.text.length * obj.fontSize * 0.6);
          const approxHeight = obj.fontSize * 1.5 + obj.padding * 2;
          return { minX: x, minY: y, maxX: x + approxWidth, maxY: y + approxHeight };
        }
        default:
          if ('width' in obj && 'height' in obj) {
            return {
              minX: x,
              minY: y,
              maxX: x + obj.width,
              maxY: y + obj.height,
            };
          }
          return { minX: x, minY: y, maxX: x, maxY: y };
      }
    },
    [stageRef]
  );

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
            setOcrProgress,
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
        if (!REPEATABLE_TOOLS.has(activeTool)) setActiveTool('select');
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
        const isAdditive = e.evt.ctrlKey || e.evt.metaKey;
        if (!isAdditive) {
          select(null);
          setEditingTextId(null);
        }
        setDrawingObject({
          type: 'select_box',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      }
    },
    [
      scale, activeUtility, activeTool, objects, colorPickerFrozen, setColorPickerFrozen,
      setOcrRegion, setOcrText, setOcrError, setOcrStatus, setOcrProgress, resetPrivacy, setPrivacyStatus,
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

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
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
        if (!REPEATABLE_TOOLS.has(activeTool)) setActiveTool('select');
      }
      setDrawingObject(null);
      return;
    }

    const dx = drawingObject.end.x - drawingObject.start.x;
    const dy = drawingObject.end.y - drawingObject.start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (drawingObject.type === 'select_box') {
      const minX = Math.min(drawingObject.start.x, drawingObject.end.x);
      const maxX = Math.max(drawingObject.start.x, drawingObject.end.x);
      const minY = Math.min(drawingObject.start.y, drawingObject.end.y);
      const maxY = Math.max(drawingObject.start.y, drawingObject.end.y);

      if (maxX - minX > 4 && maxY - minY > 4) {
        const toSelectIds = objects.filter((obj) => {
          const { minX: oMinX, minY: oMinY, maxX: oMaxX, maxY: oMaxY } = getObjectBounds(obj);
          return !(oMaxX < minX || oMinX > maxX || oMaxY < minY || oMinY > maxY);
        }).map((o) => o.id);

        const isAdditive = e.evt.ctrlKey || e.evt.metaKey;

        if (toSelectIds.length > 0) {
          if (isAdditive) {
            selectAdditive(toSelectIds);
          } else {
            selectMultiple(toSelectIds);
          }
        } else if (!isAdditive) {
          select(null);
        }
      } else if (!(e.evt.ctrlKey || e.evt.metaKey)) {
        select(null);
      }

      setDrawingObject(null);
      return;
    }

    // OCR selection
    if (drawingObject.type === 'ocr_selection') {
      completeOcrSelection(drawingObject, {
        compositionCanvas: compositionCanvasRef.current,
        setOcrRegion,
        setOcrStatus,
        setOcrProgress,
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
        if (!REPEATABLE_TOOLS.has(activeTool)) setActiveTool('select');
      }
    }

    setDrawingObject(null);
  }, [
    drawingObject, setDrawingObject, compositionCanvasRef, addObject, select, selectMultiple, selectAdditive, setActiveTool, setEditingTextId,
    setOcrRegion, setOcrStatus, setOcrProgress, setOcrText, setOcrError, ocrRequestIdRef, setScope, setSelectionRect, setPrivacyStatus,
    activeTool, objects, getObjectBounds
  ]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, drawingObject };
}
