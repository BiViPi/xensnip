import { useCallback } from 'react';
import Konva from 'konva';
import { useAnnotationStore } from './state/store';
import {
  ArrowObject,
  RectangleObject,
  BlurObject,
  SpotlightObject,
  MagnifyObject,
  SimplifyUiObject,
  PixelRulerObject,
  CalloutObject,
  FreehandArrowObject,
  PixelateObject,
  OpaqueRedactObject,
} from './state/types';
import { getCompositionCoordinates } from '../measure/coordinates';
import { extractTextFromCanvas } from '../measure/ocr';
import { DrawingObject } from './state/drawingTypes';
import { TOOL_TO_DRAW_TYPE } from './drawingTypeMap';
import { 
  createImmediateText, 
  createImmediateNumbered, 
  createImmediateSpeechBubble 
} from './immediateObjectFactory';
import { usePointerHandlersState } from './usePointerHandlersState';

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
  ocrRequestIdRef: React.MutableRefObject<number>;
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
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!stage || !pos) return;
      const stageX = pos.x / scale;
      const stageY = pos.y / scale;

      // 1. Utility logic (Color Picker, OCR, Privacy)
      if (activeUtility === 'color_picker') {
        setColorPickerFrozen(!colorPickerFrozen);
        return;
      }

      if (activeUtility === 'ocr_extract') {
        setOcrRegion(null);
        setOcrText('');
        setOcrError(null);
        setDrawingObject({
          type: 'ocr_selection',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
        setOcrStatus('selecting');
        return;
      }

      if (activeUtility === 'smart_redact_ai') {
        resetPrivacy();
        setDrawingObject({
          type: 'smart_redact_selection',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
        setPrivacyStatus('idle');
        return;
      }

      // 2. Immediate object creation (Text, Numbered, SpeechBubble)
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

      // 4. Fallback: Deselect
      const clickedOnEmpty = e.target === stage;
      if (clickedOnEmpty && activeTool === 'select') {
        select(null);
        setEditingTextId(null);
      }
    },
    [
      scale, activeUtility, activeTool, objects, colorPickerFrozen, setColorPickerFrozen,
      setOcrRegion, setOcrText, setOcrError, setOcrStatus, resetPrivacy, setPrivacyStatus,
      addObject, select, setEditingTextId, setActiveTool, setDrawingObject
    ]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!stage || !pos) return;
      const stageX = pos.x / scale;
      const stageY = pos.y / scale;

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

      let endX = stageX;
      let endY = stageY;

      if (e.evt?.shiftKey && (drawingObject.type === 'pixel_ruler' || drawingObject.type === 'arrow')) {
        const dx = Math.abs(stageX - drawingObject.start.x);
        const dy = Math.abs(stageY - drawingObject.start.y);
        if (dx > dy) endY = drawingObject.start.y;
        else endX = drawingObject.start.x;
      }

      if (drawingObject.type === 'freehand_arrow') {
        const dx = stageX - drawingObject.start.x;
        const dy = stageY - drawingObject.start.y;
        const lastX = drawingObject.points[drawingObject.points.length - 2];
        const lastY = drawingObject.points[drawingObject.points.length - 1];
        const distSq = (dx - lastX) ** 2 + (dy - lastY) ** 2;

        if (distSq > 16) {
          setDrawingObject({ ...drawingObject, points: [...drawingObject.points, dx, dy] });
        }
        return;
      }

      setDrawingObject({ ...drawingObject, end: { x: endX, y: endY } });
    },
    [scale, activeUtility, colorPickerFrozen, compositionCanvasRef, setCurrentSample, drawingObject, setDrawingObject]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawingObject) return;

    // Handle Freehand Arrow (Special points array)
    if (drawingObject.type === 'freehand_arrow') {
      let totalPathLength = 0;
      for (let i = 2; i < drawingObject.points.length; i += 2) {
        const segDx = drawingObject.points[i] - drawingObject.points[i - 2];
        const segDy = drawingObject.points[i + 1] - drawingObject.points[i - 1];
        totalPathLength += Math.sqrt(segDx * segDx + segDy * segDy);
      }

      if (totalPathLength > 20) {
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

    // Handle OCR Selection
    if (drawingObject.type === 'ocr_selection') {
      const selection = {
        x: Math.min(drawingObject.start.x, drawingObject.end.x),
        y: Math.min(drawingObject.start.y, drawingObject.end.y),
        width: Math.abs(dx), height: Math.abs(dy),
      };
      if (selection.width > 5 && selection.height > 5) {
        const canvas = compositionCanvasRef.current;
        if (canvas) {
          setOcrRegion(selection); setOcrStatus('running'); setOcrText(''); setOcrError(null);
          const reqId = ++ocrRequestIdRef.current;
          const region = getCompositionCoordinates(selection.x, selection.y, canvas.width, canvas.height);
          const regionWidth = Math.max(1, Math.min(canvas.width - region.x, Math.ceil(selection.width)));
          const regionHeight = Math.max(1, Math.min(canvas.height - region.y, Math.ceil(selection.height)));

          extractTextFromCanvas(canvas, { x: region.x, y: region.y, width: regionWidth, height: regionHeight })
            .then((text) => {
              if (ocrRequestIdRef.current === reqId) {
                setOcrText(text); setOcrStatus('ready');
              }
            })
            .catch((err) => {
              if (ocrRequestIdRef.current === reqId) {
                setOcrError(err.message); setOcrStatus('error');
              }
            });
        }
      } else {
        setOcrRegion(null); setOcrStatus('idle');
      }
      setDrawingObject(null);
      return;
    }

    // Handle Privacy Selection
    if (drawingObject.type === 'smart_redact_selection') {
      const selection = {
        x: Math.min(drawingObject.start.x, drawingObject.end.x),
        y: Math.min(drawingObject.start.y, drawingObject.end.y),
        width: Math.abs(dx), height: Math.abs(dy),
      };
      if (selection.width > 5 && selection.height > 5) {
        setScope('selection'); setSelectionRect(selection); setPrivacyStatus('idle');
      } else {
        setSelectionRect(null); setScope('full_canvas');
      }
      setDrawingObject(null);
      return;
    }

    // Handle regular shapes
    if (dist > 4) {
      const newId = `obj-${Date.now()}`;
      if (drawingObject.type === 'arrow') {
        const arrow: ArrowObject = {
          id: newId, type: 'arrow', x: drawingObject.start.x, y: drawingObject.start.y, rotation: 0,
          points: [0, 0, dx, dy], stroke: '#ef4444', strokeWidth: 4, pointerLength: 12, pointerWidth: 12,
          style: 'solid', draggable: true,
        };
        addObject(arrow);
      } else if (drawingObject.type === 'rectangle') {
        const rect: RectangleObject = {
          id: newId, type: 'rectangle', x: Math.min(drawingObject.start.x, drawingObject.end.x), y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0, width: Math.abs(dx), height: Math.abs(dy), stroke: '#ef4444', strokeWidth: 4, lineStyle: 'solid', cornerRadius: 0, draggable: true,
        };
        addObject(rect);
      } else if (drawingObject.type === 'blur') {
        const blur: BlurObject = {
          id: newId, type: 'blur', x: Math.min(drawingObject.start.x, drawingObject.end.x), y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0, width: Math.abs(dx), height: Math.abs(dy), blurRadius: 10, draggable: true,
        };
        addObject(blur);
      } else if (drawingObject.type === 'pixelate') {
        const pixelate: PixelateObject = {
          id: newId, type: 'pixelate', x: Math.min(drawingObject.start.x, drawingObject.end.x), y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0, width: Math.abs(dx), height: Math.abs(dy), pixelSize: 12, borderColor: '#000000', borderWidth: 0, draggable: true,
        };
        addObject(pixelate);
      } else if (drawingObject.type === 'opaque_redact') {
        const redact: OpaqueRedactObject = {
          id: newId, type: 'opaque_redact', x: Math.min(drawingObject.start.x, drawingObject.end.x), y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0, width: Math.abs(dx), height: Math.abs(dy), fill: '#000000', borderColor: '#000000', borderWidth: 0, draggable: true,
        };
        addObject(redact);
      } else if (drawingObject.type === 'spotlight') {
        const spotlight: SpotlightObject = {
          id: newId, type: 'spotlight', x: Math.min(drawingObject.start.x, drawingObject.end.x), y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0, width: Math.abs(dx), height: Math.abs(dy), opacity: 0.58, cornerRadius: 24, draggable: true,
        };
        addObject(spotlight);
      } else if (drawingObject.type === 'magnify') {
        const rw = Math.abs(dx), rh = Math.abs(dy);
        const magnify: MagnifyObject = {
          id: newId, type: 'magnify', x: Math.min(drawingObject.start.x, drawingObject.end.x), y: Math.min(drawingObject.start.y, drawingObject.end.y),
          sourceX: Math.min(drawingObject.start.x, drawingObject.end.x), sourceY: Math.min(drawingObject.start.y, drawingObject.end.y),
          sourceWidth: rw, sourceHeight: rh, rotation: 0, width: rw * 1.8, height: rh * 1.8, zoom: 1.8, cornerRadius: 20, borderOpacity: 0.8, draggable: true,
        };
        addObject(magnify);
      } else if (drawingObject.type === 'simplify_ui') {
        const simplifyUi: SimplifyUiObject = {
          id: newId, type: 'simplify_ui', x: Math.min(drawingObject.start.x, drawingObject.end.x), y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0, width: Math.abs(dx), height: Math.abs(dy), dimOpacity: 0.52, blurRadius: 4, saturation: 0.35, cornerRadius: 24, draggable: true,
        };
        addObject(simplifyUi);
      } else if (drawingObject.type === 'pixel_ruler') {
        const ruler: PixelRulerObject = {
          id: newId, type: 'pixel_ruler', x: drawingObject.start.x, y: drawingObject.start.y, rotation: 0,
          points: [0, 0, dx, dy], stroke: '#ef4444', strokeWidth: 2, labelFill: '#ffffff', showBackground: true, draggable: true,
        };
        addObject(ruler);
      } else if (drawingObject.type === 'callout') {
        const callout: CalloutObject = {
          id: newId, type: 'callout', x: drawingObject.end.x, y: drawingObject.end.y, rotation: 0,
          width: 120, height: 48, text: 'Callout', fontSize: 14, fontFamily: 'Inter, sans-serif', fill: '#ffffff',
          textColor: '#1e1e2e', stroke: '#1e1e2e', padding: 8, cornerRadius: 4, targetX: drawingObject.start.x, targetY: drawingObject.start.y,
          lineColor: '#1e1e2e', lineWidth: 2, draggable: true,
        };
        addObject(callout);
        select(newId);
        setEditingTextId(newId);
      }
      select(newId);
      setActiveTool('select');
    }
    setDrawingObject(null);
  }, [
    drawingObject, setDrawingObject, compositionCanvasRef, addObject, select, setActiveTool, setEditingTextId,
    setOcrRegion, setOcrStatus, setOcrText, setOcrError, ocrRequestIdRef, setScope, setSelectionRect, setPrivacyStatus,
  ]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, drawingObject };
}
