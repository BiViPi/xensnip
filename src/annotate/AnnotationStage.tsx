import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Arrow, Rect } from 'react-konva';
import { useAnnotationStore } from './state/store';
import { ObjectsLayer } from './ObjectsLayer';
import { ArrowObject, RectangleObject, TextObject, BlurObject, NumberedObject, SpotlightObject, MagnifyObject, SimplifyUiObject, PixelRulerObject } from './state/types';
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
  crop: 'default',
  canvas: 'default',
};

export function AnnotationStage({ width, height, scale, compositionCanvasRef, stageRef }: AnnotationStageProps) {
  const { activeTool, select, addObject, updateObject, setActiveTool, objects, editingTextId, setEditingTextId } = useAnnotationStore();
  const { activeUtility, setCurrentSample, colorPickerFrozen, setColorPickerFrozen, setOcrStatus, setOcrText, setOcrError } = useMeasureStore();
  const [drawingObject, setDrawingObject] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stageWidth = width / scale;
  const stageHeight = height / scale;

  const editingText = objects.find((obj): obj is TextObject => obj.type === 'text' && obj.id === editingTextId);
  const overlay = document.getElementById('annotation-ui-overlay');

  useEffect(() => {
    if (!editingText || !textareaRef.current) return;

    textareaRef.current.focus();
    textareaRef.current.select();
  }, [editingText?.id]);

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
    } else {
      const clickedOnEmpty = e.target === stage;
      if (clickedOnEmpty && activeTool === 'select') {
        select(null);
        setEditingTextId(null);
      }
    }
  };

  const closeTextEditor = (value: string) => {
    if (!editingText) return;

    updateObject(editingText.id, { text: value || 'Type here...' });
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

    setDrawingObject({
      ...drawingObject,
      end: { x: endX, y: endY }
    });
  };

  const handleMouseUp = () => {
    if (!drawingObject) return;

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
          setOcrStatus('running');
          const region = getCompositionCoordinates(selection.x, selection.y, canvas.width, canvas.height);
          const size = getCompositionCoordinates(selection.width, selection.height, canvas.width, canvas.height);
          
          extractTextFromCanvas(canvas, { 
            x: region.x, 
            y: region.y, 
            width: size.x, 
            height: size.y 
          }).then(text => {
            setOcrText(text);
            setOcrStatus('ready');
          }).catch(err => {
            setOcrError(err.message);
            setOcrStatus('error');
          });
        }
      } else {
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
      {editingText && overlay && createPortal(
        <textarea
          ref={textareaRef}
          defaultValue={editingText.text === 'Type here...' ? '' : editingText.text}
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
            left: `${editingText.x * scale}px`,
            top: `${editingText.y * scale}px`,
            minWidth: `${120 * scale}px`,
            minHeight: `${32 * scale}px`,
            fontSize: `${editingText.fontSize * scale}px`,
            fontFamily: editingText.fontFamily,
            color: editingText.fill,
            background: 'transparent',
            border: '1px dashed rgba(99, 102, 241, 0.65)',
            padding: `${editingText.padding * scale}px`,
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
      <OCRResultToolbar />
    </>
  );
}
