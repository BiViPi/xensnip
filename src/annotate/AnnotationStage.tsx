import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Arrow, Rect } from 'react-konva';
import { useAnnotationStore } from './state/store';
import { ObjectsLayer } from './ObjectsLayer';
import { ArrowObject, RectangleObject, TextObject, BlurObject, NumberedObject, SpotlightObject, MagnifyObject, SimplifyUiObject, PixelRulerObject, SpeechBubbleObject, CalloutObject, FreehandArrowObject } from './state/types';
import { getTextEditableContract } from './state/textEditable';
import { SelectionTransformer } from './SelectionTransformer';
import { createPortal } from 'react-dom';
import { getSpotlightCornerRadius } from './renderers/spotlightLayout';
import { useMeasureStore } from '../measure/store';
import { getCompositionCoordinates } from '../measure/coordinates';
import { GridOverlay } from '../measure/GridOverlay';
import { extractTextFromCanvas } from '../measure/ocr';
import { OCRResultToolbar } from '../measure/OCRResultToolbar';

interface AnnotationStageProps {
  width: number;
  height: number;
  scale: number;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageRef: React.RefObject<any>;
}

const TOOL_CURSOR: Record<string, string> = {
  select: 'default',
  arrow: 'crosshair',
  rectangle: 'crosshair',
  blur: 'crosshair',
  spotlight: 'crosshair',
  magnify: 'crosshair',
  simplify_ui: 'crosshair',
  text: 'text',
  numbered: 'cell',
  pixel_ruler: 'crosshair',
  speech_bubble: 'crosshair',
  callout: 'crosshair',
  freehand_arrow: 'crosshair',
  crop: 'default',
  canvas: 'default',
};

export function AnnotationStage({ width, height, scale, compositionCanvasRef, stageRef }: AnnotationStageProps) {
  const { activeTool, select, addObject, updateObject, setActiveTool, objects, editingTextId, setEditingTextId } = useAnnotationStore();
  const {
    activeUtility,
    setCurrentSample,
    colorPickerFrozen,
    setColorPickerFrozen,
    ocrRegion,
    setOcrRegion,
    setOcrStatus,
    setOcrText,
    setOcrError,
  } = useMeasureStore();
  const [drawingObject, setDrawingObject] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ocrRequestIdRef = useRef<number>(0);
  const stageWidth = width / scale;
  const stageHeight = height / scale;

  const contract = getTextEditableContract(objects.find(obj => obj.id === editingTextId) || null);
  const overlay = document.getElementById('annotation-ui-overlay');

  useEffect(() => {
    if (!contract || !textareaRef.current) return;

    textareaRef.current.focus();
    textareaRef.current.select();
  }, [contract?.id]);

  useEffect(() => {
    if (activeUtility === 'ocr_extract') return;

    ocrRequestIdRef.current += 1;
    setDrawingObject((current: any) => current?.type === 'ocr_selection' ? null : current);
    setOcrRegion(null);
    setOcrStatus('idle');
    setOcrText('');
    setOcrError(null);
  }, [activeUtility, setOcrError, setOcrRegion, setOcrStatus, setOcrText]);

  const dismissOcrResult = () => {
    ocrRequestIdRef.current += 1;
    setOcrRegion(null);
    setOcrStatus('idle');
    setOcrText('');
    setOcrError(null);
  };

  const handleMouseDown = (e: any) => {
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
        end: { x: stageX, y: stageY }
      });
      setOcrStatus('selecting');
      return;
    }

    if (activeTool === 'arrow') {
      setDrawingObject({
        type: 'arrow',
        start: { x: stageX, y: stageY },
        end: { x: stageX, y: stageY }
      });
    } else if (activeTool === 'rectangle') {
      setDrawingObject({
        type: 'rectangle',
        start: { x: stageX, y: stageY },
        end: { x: stageX, y: stageY }
      });
    } else if (activeTool === 'blur') {
      setDrawingObject({
        type: 'blur',
        start: { x: stageX, y: stageY },
        end: { x: stageX, y: stageY }
      });
    } else if (activeTool === 'spotlight') {
      setDrawingObject({
        type: 'spotlight',
        start: { x: stageX, y: stageY },
        end: { x: stageX, y: stageY }
      });
    } else if (activeTool === 'magnify') {
      setDrawingObject({
        type: 'magnify',
        start: { x: stageX, y: stageY },
        end: { x: stageX, y: stageY }
      });
    } else if (activeTool === 'simplify_ui') {
      setDrawingObject({
        type: 'simplify_ui',
        start: { x: stageX, y: stageY },
        end: { x: stageX, y: stageY }
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
        end: { x: stageX, y: stageY }
      });
    } else if (activeTool === 'numbered') {
      const nextNum = objects.filter(o => o.type === 'numbered').length + 1;
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
        end: { x: stageX, y: stageY }
      });
    } else if (activeTool === 'freehand_arrow') {
      setDrawingObject({
        type: 'freehand_arrow',
        start: { x: stageX, y: stageY },
        points: [0, 0]
      });
    } else {
      const clickedOnEmpty = e.target === stage;
      if (clickedOnEmpty && activeTool === 'select') {
        select(null);
        setEditingTextId(null);
      }
    }
  };

  const closeTextEditor = (value: string) => {
    if (!contract) return;

    updateObject(contract.id, { text: value || 'Type here...' });
    setEditingTextId(null);
  };

  const handleMouseMove = (e: any) => {
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
          const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
          setCurrentSample({
            x: stageX, 
            y: stageY,
            rgb: [pixel[0], pixel[1], pixel[2]],
            hex
          });
        }
      }
    }
    if (!drawingObject) return;

    let endX = stageX;
    let endY = stageY;

    if (e.evt?.shiftKey && (drawingObject.type === 'pixel_ruler' || drawingObject.type === 'arrow')) {
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

      if (distSq > 16) { // 4px minimum movement
        setDrawingObject({
          ...drawingObject,
          points: [...drawingObject.points, dx, dy]
        });
      }
      return;
    }

    setDrawingObject({
      ...drawingObject,
      end: { x: endX, y: endY }
    });
  };

  const handleMouseUp = () => {
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
        height: Math.abs(dy)
      };
      
      if (selection.width > 5 && selection.height > 5) {
        const canvas = compositionCanvasRef.current;
        if (canvas) {
          setOcrRegion(selection);
          setOcrStatus('running');
          setOcrText('');
          setOcrError(null);
          const reqId = ++ocrRequestIdRef.current;
          const region = getCompositionCoordinates(selection.x, selection.y, canvas.width, canvas.height);
          const regionWidth = Math.max(1, Math.min(canvas.width - region.x, Math.ceil(selection.width)));
          const regionHeight = Math.max(1, Math.min(canvas.height - region.y, Math.ceil(selection.height)));
          
          extractTextFromCanvas(canvas, { 
            x: region.x, 
            y: region.y, 
            width: regionWidth, 
            height: regionHeight 
          }).then(text => {
            if (ocrRequestIdRef.current === reqId) {
              setOcrText(text);
              setOcrStatus('ready');
            }
          }).catch(err => {
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
  };

  return (
    <>
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={stageRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'auto',
          cursor: activeUtility === 'color_picker' ? 'crosshair' : (TOOL_CURSOR[activeTool] ?? 'default'),
        }}
      >
        <GridOverlay width={stageWidth} height={stageHeight} />
        <Layer>
          <ObjectsLayer 
            compositionCanvasRef={compositionCanvasRef} 
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            scale={scale}
          />
          <SelectionTransformer />

          {drawingObject?.type === 'arrow' && (
            <Arrow
              points={[
                0, 0,
                drawingObject.end.x - drawingObject.start.x,
                drawingObject.end.y - drawingObject.start.y
              ]}
              x={drawingObject.start.x}
              y={drawingObject.start.y}
              stroke="#ef4444"
              strokeWidth={4}
              opacity={0.6}
              pointerLength={12}
              pointerWidth={12}
            />
          )}

          {drawingObject?.type === 'pixel_ruler' && (
            <Arrow
              points={[
                0, 0,
                drawingObject.end.x - drawingObject.start.x,
                drawingObject.end.y - drawingObject.start.y
              ]}
              x={drawingObject.start.x}
              y={drawingObject.start.y}
              stroke="#ef4444"
              strokeWidth={2}
              opacity={0.6}
              pointerAtBeginning={true}
              pointerAtEnding={true}
              pointerLength={6}
              pointerWidth={6}
            />
          )}

          {(drawingObject?.type === 'rectangle' || drawingObject?.type === 'blur' || drawingObject?.type === 'magnify' || drawingObject?.type === 'simplify_ui' || drawingObject?.type === 'ocr_selection') && (
            <Rect
              x={Math.min(drawingObject.start.x, drawingObject.end.x)}
              y={Math.min(drawingObject.start.y, drawingObject.end.y)}
              width={Math.abs(drawingObject.end.x - drawingObject.start.x)}
              height={Math.abs(drawingObject.end.y - drawingObject.start.y)}
              stroke={drawingObject?.type === 'blur' || drawingObject?.type === 'simplify_ui' ? "rgba(255,255,255,0.5)" : (drawingObject?.type === 'ocr_selection' ? "#fbbf24" : "#ef4444")}
              strokeWidth={drawingObject?.type === 'blur' || drawingObject?.type === 'simplify_ui' ? 1 : (drawingObject?.type === 'ocr_selection' ? 2 : 4)}
              fill={drawingObject?.type === 'blur' || drawingObject?.type === 'simplify_ui' ? "rgba(255,255,255,0.2)" : (drawingObject?.type === 'ocr_selection' ? "rgba(251, 191, 36, 0.1)" : "transparent")}
              dash={drawingObject?.type === 'ocr_selection' ? [4, 4] : undefined}
              opacity={0.6}
            />
          )}

          {activeUtility === 'ocr_extract' && ocrRegion && drawingObject?.type !== 'ocr_selection' && (
            <Rect
              x={ocrRegion.x}
              y={ocrRegion.y}
              width={ocrRegion.width}
              height={ocrRegion.height}
              stroke="rgba(99, 102, 241, 0.9)"
              strokeWidth={2}
              dash={[6, 4]}
              fill="rgba(99, 102, 241, 0.07)"
              listening={false}
            />
          )}

          {drawingObject?.type === 'spotlight' && (
            <>
              <Rect
                x={0}
                y={0}
                width={stageWidth}
                height={stageHeight}
                fill="rgba(2, 6, 23, 0.58)"
                listening={false}
              />
              <Rect
                x={Math.min(drawingObject.start.x, drawingObject.end.x)}
                y={Math.min(drawingObject.start.y, drawingObject.end.y)}
                width={Math.abs(drawingObject.end.x - drawingObject.start.x)}
                height={Math.abs(drawingObject.end.y - drawingObject.start.y)}
                cornerRadius={getSpotlightCornerRadius({
                  id: 'spotlight-preview',
                  type: 'spotlight',
                  x: 0,
                  y: 0,
                  rotation: 0,
                  width: Math.abs(drawingObject.end.x - drawingObject.start.x),
                  height: Math.abs(drawingObject.end.y - drawingObject.start.y),
                  opacity: 0.58,
                  cornerRadius: 24,
                  draggable: false,
                })}
                fill="#000"
                globalCompositeOperation="destination-out"
                listening={false}
              />
              <Rect
                x={Math.min(drawingObject.start.x, drawingObject.end.x)}
                y={Math.min(drawingObject.start.y, drawingObject.end.y)}
                width={Math.abs(drawingObject.end.x - drawingObject.start.x)}
                height={Math.abs(drawingObject.end.y - drawingObject.start.y)}
                cornerRadius={getSpotlightCornerRadius({
                  id: 'spotlight-preview',
                  type: 'spotlight',
                  x: 0,
                  y: 0,
                  rotation: 0,
                  width: Math.abs(drawingObject.end.x - drawingObject.start.x),
                  height: Math.abs(drawingObject.end.y - drawingObject.start.y),
                  opacity: 0.58,
                  cornerRadius: 24,
                  draggable: false,
                })}
                fill="rgba(255,255,255,0.001)"
                stroke="#818cf8"
                strokeWidth={2}
                shadowColor="#22d3ee"
                shadowBlur={18}
                shadowOpacity={0.28}
                listening={false}
              />
            </>
          )}
        </Layer>
      </Stage>
      {contract && overlay && createPortal(
        <textarea
          ref={textareaRef}
          defaultValue={contract.currentText === 'Type here...' ? '' : contract.currentText}
          onBlur={(e) => closeTextEditor(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              setEditingTextId(null);
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              closeTextEditor(e.currentTarget.value);
            }
          }}
          placeholder="Type here..."
          style={{
            position: 'absolute',
            left: `${contract.overlayX * scale}px`,
            top: `${contract.overlayY * scale}px`,
            width: contract.fixedSize ? `${contract.overlayWidth * scale}px` : undefined,
            height: contract.fixedSize ? `${contract.overlayHeight * scale}px` : undefined,
            minWidth: !contract.fixedSize ? `${contract.overlayWidth * scale}px` : undefined,
            minHeight: !contract.fixedSize ? `${contract.overlayHeight * scale}px` : undefined,
            fontSize: `${contract.fontSize * scale}px`,
            fontFamily: contract.fontFamily,
            color: contract.textColor,
            background: 'transparent',
            border: '1px dashed rgba(99, 102, 241, 0.65)',
            padding: 0,
            margin: 0,
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            pointerEvents: 'auto',
            zIndex: 1001,
            lineHeight: 1.1,
            display: 'block',
          }}
        />,
        overlay
      )}
      <OCRResultToolbar onDismiss={dismissOcrResult} scale={scale} />
    </>
  );
}
