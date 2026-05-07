import { useState, useCallback } from 'react';
import { useAnnotationStore } from './state/store';
import {
  ArrowObject,
  RectangleObject,
  TextObject,
  BlurObject,
  NumberedObject,
  SpotlightObject,
  MagnifyObject,
  SimplifyUiObject,
  PixelRulerObject,
  SpeechBubbleObject,
  CalloutObject,
  FreehandArrowObject,
  PixelateObject,
  OpaqueRedactObject,
} from './state/types';
import { getCompositionCoordinates } from '../measure/coordinates';
import { extractTextFromCanvas } from '../measure/ocr';

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
  handleMouseDown: (e: any) => void;
  handleMouseMove: (e: any) => void;
  handleMouseUp: () => void;
  drawingObject: any;
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

  const [drawingObject, setDrawingObject] = useState<any>(null);

  const handleMouseDown = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const stageX = pos.x / scale;
      const stageY = pos.y / scale;

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

      if (activeTool === 'arrow') {
        setDrawingObject({
          type: 'arrow',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'rectangle') {
        setDrawingObject({
          type: 'rectangle',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'blur') {
        setDrawingObject({
          type: 'blur',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'pixelate') {
        setDrawingObject({
          type: 'pixelate',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'opaque_redact') {
        setDrawingObject({
          type: 'opaque_redact',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'spotlight') {
        setDrawingObject({
          type: 'spotlight',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'magnify') {
        setDrawingObject({
          type: 'magnify',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'simplify_ui') {
        setDrawingObject({
          type: 'simplify_ui',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'text') {
        const newId = `obj-${Date.now()}`;
        const text: TextObject = {
          id: newId,
          type: 'text',
          x: stageX,
          y: stageY,
          rotation: 0,
          text: 'Type here...',
          fontSize: 24,
          fontFamily: 'Inter, sans-serif',
          fill: '#ef4444',
          padding: 4,
          fontStyle: 'normal',
          align: 'left',
          draggable: true,
        };
        addObject(text);
        select(newId);
        setEditingTextId(newId);
        setActiveTool('select');
      } else if (activeTool === 'pixel_ruler') {
        setDrawingObject({
          type: 'pixel_ruler',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'numbered') {
        const nextNum = objects.filter((o) => o.type === 'numbered').length + 1;
        const newId = `obj-${Date.now()}`;
        const numbered: NumberedObject = {
          id: newId,
          type: 'numbered',
          x: stageX,
          y: stageY,
          rotation: 0,
          displayNumber: nextNum,
          fill: '#ef4444',
          radius: 14,
          draggable: true,
        };
        addObject(numbered);
        select(newId);
        setActiveTool('select');
      } else if (activeTool === 'speech_bubble') {
        const newId = `obj-${Date.now()}`;
        const bubble: SpeechBubbleObject = {
          id: newId,
          type: 'speech_bubble',
          x: stageX - 80,
          y: stageY - 36,
          rotation: 0,
          width: 160,
          height: 72,
          text: 'Type here...',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: '#ffffff',
          textColor: '#1e1e2e',
          stroke: '#1e1e2e',
          padding: 10,
          cornerRadius: 10,
          tailX: 80,
          tailY: 90,
          draggable: true,
        };
        addObject(bubble);
        select(newId);
        setEditingTextId(newId);
        setActiveTool('select');
      } else if (activeTool === 'callout') {
        setDrawingObject({
          type: 'callout',
          start: { x: stageX, y: stageY },
          end: { x: stageX, y: stageY },
        });
      } else if (activeTool === 'freehand_arrow') {
        setDrawingObject({
          type: 'freehand_arrow',
          start: { x: stageX, y: stageY },
          points: [0, 0],
        });
      } else {
        const clickedOnEmpty = e.target === stage;
        if (clickedOnEmpty && activeTool === 'select') {
          select(null);
          setEditingTextId(null);
        }
      }
    },
    [
      scale,
      activeUtility,
      activeTool,
      objects,
      colorPickerFrozen,
      setColorPickerFrozen,
      setOcrRegion,
      setOcrText,
      setOcrError,
      setOcrStatus,
      resetPrivacy,
      setPrivacyStatus,
      addObject,
      select,
      setEditingTextId,
      setActiveTool,
    ]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const stageX = pos.x / scale;
      const stageY = pos.y / scale;

      if (activeUtility === 'color_picker' && !colorPickerFrozen) {
        const canvas = compositionCanvasRef.current;
        if (canvas) {
          const { x, y } = getCompositionCoordinates(stageX, stageY, canvas.width, canvas.height);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex =
              '#' +
              ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
                .toString(16)
                .slice(1)
                .toUpperCase();
            setCurrentSample({
              x: stageX,
              y: stageY,
              rgb: [pixel[0], pixel[1], pixel[2]],
              hex,
            });
          }
        }
      }

      if (!drawingObject) return;

      let endX = stageX;
      let endY = stageY;

      if (
        e.evt?.shiftKey &&
        (drawingObject.type === 'pixel_ruler' || drawingObject.type === 'arrow')
      ) {
        const dx = Math.abs(stageX - drawingObject.start.x);
        const dy = Math.abs(stageY - drawingObject.start.y);
        if (dx > dy) {
          endY = drawingObject.start.y;
        } else {
          endX = drawingObject.start.x;
        }
      }

      if (drawingObject.type === 'freehand_arrow') {
        const dx = stageX - drawingObject.start.x;
        const dy = stageY - drawingObject.start.y;

        const lastX = drawingObject.points[drawingObject.points.length - 2];
        const lastY = drawingObject.points[drawingObject.points.length - 1];
        const distSq = (dx - lastX) ** 2 + (dy - lastY) ** 2;

        if (distSq > 16) {
          // 4px minimum movement
          setDrawingObject({
            ...drawingObject,
            points: [...drawingObject.points, dx, dy],
          });
        }
        return;
      }

      setDrawingObject({
        ...drawingObject,
        end: { x: endX, y: endY },
      });
    },
    [scale, activeUtility, colorPickerFrozen, compositionCanvasRef, setCurrentSample, drawingObject]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawingObject) return;

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
          x: drawingObject.start.x,
          y: drawingObject.start.y,
          rotation: 0,
          points: drawingObject.points,
          stroke: '#ef4444',
          strokeWidth: 4,
          smoothing: 0.5,
          pointerLength: 12,
          pointerWidth: 12,
          draggable: true,
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

    if (drawingObject.type === 'ocr_selection') {
      const selection = {
        x: Math.min(drawingObject.start.x, drawingObject.end.x),
        y: Math.min(drawingObject.start.y, drawingObject.end.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      };

      if (selection.width > 5 && selection.height > 5) {
        const canvas = compositionCanvasRef.current;
        if (canvas) {
          setOcrRegion(selection);
          setOcrStatus('running');
          setOcrText('');
          setOcrError(null);
          const reqId = ++ocrRequestIdRef.current;
          const region = getCompositionCoordinates(
            selection.x,
            selection.y,
            canvas.width,
            canvas.height
          );
          const regionWidth = Math.max(
            1,
            Math.min(canvas.width - region.x, Math.ceil(selection.width))
          );
          const regionHeight = Math.max(
            1,
            Math.min(canvas.height - region.y, Math.ceil(selection.height))
          );

          extractTextFromCanvas(canvas, {
            x: region.x,
            y: region.y,
            width: regionWidth,
            height: regionHeight,
          })
            .then((text) => {
              if (ocrRequestIdRef.current === reqId) {
                setOcrText(text);
                setOcrStatus('ready');
              }
            })
            .catch((err) => {
              if (ocrRequestIdRef.current === reqId) {
                setOcrError(err.message);
                setOcrStatus('error');
              }
            });
        }
      } else {
        setOcrRegion(null);
        setOcrStatus('idle');
      }
      setDrawingObject(null);
      return;
    }

    if (drawingObject.type === 'smart_redact_selection') {
      const selection = {
        x: Math.min(drawingObject.start.x, drawingObject.end.x),
        y: Math.min(drawingObject.start.y, drawingObject.end.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      };

      if (selection.width > 5 && selection.height > 5) {
        setScope('selection');
        setSelectionRect(selection);
        setPrivacyStatus('idle');
      } else {
        setSelectionRect(null);
        setScope('full_canvas');
      }
      setDrawingObject(null);
      return;
    }

    if (dist > 4) {
      const newId = `obj-${Date.now()}`;
      if (drawingObject.type === 'arrow') {
        const arrow: ArrowObject = {
          id: newId,
          type: 'arrow',
          x: drawingObject.start.x,
          y: drawingObject.start.y,
          rotation: 0,
          points: [0, 0, dx, dy],
          stroke: '#ef4444',
          strokeWidth: 4,
          pointerLength: 12,
          pointerWidth: 12,
          style: 'solid',
          draggable: true,
        };
        addObject(arrow);
      } else if (drawingObject.type === 'rectangle') {
        const rect: RectangleObject = {
          id: newId,
          type: 'rectangle',
          x: Math.min(drawingObject.start.x, drawingObject.end.x),
          y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0,
          width: Math.abs(dx),
          height: Math.abs(dy),
          stroke: '#ef4444',
          strokeWidth: 4,
          lineStyle: 'solid',
          cornerRadius: 0,
          draggable: true,
        };
        addObject(rect);
      } else if (drawingObject.type === 'blur') {
        const blur: BlurObject = {
          id: newId,
          type: 'blur',
          x: Math.min(drawingObject.start.x, drawingObject.end.x),
          y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0,
          width: Math.abs(dx),
          height: Math.abs(dy),
          blurRadius: 10,
          draggable: true,
        };
        addObject(blur);
      } else if (drawingObject.type === 'pixelate') {
        const pixelate: PixelateObject = {
          id: newId,
          type: 'pixelate',
          x: Math.min(drawingObject.start.x, drawingObject.end.x),
          y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0,
          width: Math.abs(dx),
          height: Math.abs(dy),
          pixelSize: 12,
          borderColor: '#000000',
          borderWidth: 0,
          draggable: true,
        };
        addObject(pixelate);
      } else if (drawingObject.type === 'opaque_redact') {
        const redact: OpaqueRedactObject = {
          id: newId,
          type: 'opaque_redact',
          x: Math.min(drawingObject.start.x, drawingObject.end.x),
          y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0,
          width: Math.abs(dx),
          height: Math.abs(dy),
          fill: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          draggable: true,
        };
        addObject(redact);
      } else if (drawingObject.type === 'spotlight') {
        const spotlight: SpotlightObject = {
          id: newId,
          type: 'spotlight',
          x: Math.min(drawingObject.start.x, drawingObject.end.x),
          y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0,
          width: Math.abs(dx),
          height: Math.abs(dy),
          opacity: 0.58,
          cornerRadius: 24,
          draggable: true,
        };
        addObject(spotlight);
      } else if (drawingObject.type === 'magnify') {
        const rectWidth = Math.abs(dx);
        const rectHeight = Math.abs(dy);
        const magnify: MagnifyObject = {
          id: newId,
          type: 'magnify',
          x: Math.min(drawingObject.start.x, drawingObject.end.x),
          y: Math.min(drawingObject.start.y, drawingObject.end.y),
          sourceX: Math.min(drawingObject.start.x, drawingObject.end.x),
          sourceY: Math.min(drawingObject.start.y, drawingObject.end.y),
          sourceWidth: rectWidth,
          sourceHeight: rectHeight,
          rotation: 0,
          width: rectWidth * 1.8,
          height: rectHeight * 1.8,
          zoom: 1.8,
          cornerRadius: 20,
          borderOpacity: 0.8,
          draggable: true,
        };
        addObject(magnify);
      } else if (drawingObject.type === 'simplify_ui') {
        const simplifyUi: SimplifyUiObject = {
          id: newId,
          type: 'simplify_ui',
          x: Math.min(drawingObject.start.x, drawingObject.end.x),
          y: Math.min(drawingObject.start.y, drawingObject.end.y),
          rotation: 0,
          width: Math.abs(dx),
          height: Math.abs(dy),
          dimOpacity: 0.52,
          blurRadius: 4,
          saturation: 0.35,
          cornerRadius: 24,
          draggable: true,
        };
        addObject(simplifyUi);
      } else if (drawingObject.type === 'pixel_ruler') {
        const ruler: PixelRulerObject = {
          id: newId,
          type: 'pixel_ruler',
          x: drawingObject.start.x,
          y: drawingObject.start.y,
          rotation: 0,
          points: [0, 0, dx, dy],
          stroke: '#ef4444',
          strokeWidth: 2,
          labelFill: '#ffffff',
          showBackground: true,
          draggable: true,
        };
        addObject(ruler);
      } else if (drawingObject.type === 'callout') {
        const callout: CalloutObject = {
          id: newId,
          type: 'callout',
          x: drawingObject.end.x,
          y: drawingObject.end.y,
          rotation: 0,
          width: 120,
          height: 48,
          text: 'Callout',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fill: '#ffffff',
          textColor: '#1e1e2e',
          stroke: '#1e1e2e',
          padding: 8,
          cornerRadius: 4,
          targetX: drawingObject.start.x,
          targetY: drawingObject.start.y,
          lineColor: '#1e1e2e',
          lineWidth: 2,
          draggable: true,
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
    drawingObject,
    compositionCanvasRef,
    addObject,
    select,
    setActiveTool,
    setEditingTextId,
    setOcrRegion,
    setOcrStatus,
    setOcrText,
    setOcrError,
    ocrRequestIdRef,
    setScope,
    setSelectionRect,
    setPrivacyStatus,
  ]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, drawingObject };
}
