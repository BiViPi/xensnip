import { useState } from 'react';
import { Stage, Layer, Arrow, Rect } from 'react-konva';
import { useAnnotationStore } from './state/store';
import { ObjectsLayer } from './ObjectsLayer';
import { ArrowObject, RectangleObject, TextObject, BlurObject, NumberedObject } from './state/types';
import { SelectionTransformer } from './SelectionTransformer';

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
  text: 'text',
  numbered: 'cell',
  crop: 'default',
  canvas: 'default',
};

export function AnnotationStage({ width, height, scale, compositionCanvasRef, stageRef }: AnnotationStageProps) {
  const { activeTool, select, addObject, setActiveTool, objects, setEditingTextId } = useAnnotationStore();
  const [drawingObject, setDrawingObject] = useState<any>(null);

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const stageX = pos.x / scale;
    const stageY = pos.y / scale;

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

  const handleMouseMove = (e: any) => {
    if (!drawingObject) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const stageX = pos.x / scale;
    const stageY = pos.y / scale;

    setDrawingObject({
      ...drawingObject,
      end: { x: stageX, y: stageY }
    });
  };

  const handleMouseUp = () => {
    if (!drawingObject) return;

    const dx = drawingObject.end.x - drawingObject.start.x;
    const dy = drawingObject.end.y - drawingObject.start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

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
          fill: 'transparent',
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
      }
      select(newId);
      setActiveTool('select');
    }

    setDrawingObject(null);
  };

  return (
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
        cursor: TOOL_CURSOR[activeTool] ?? 'default',
      }}
    >
      <Layer>
        <ObjectsLayer scale={scale} compositionCanvasRef={compositionCanvasRef} />
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

        {(drawingObject?.type === 'rectangle' || drawingObject?.type === 'blur') && (
          <Rect
            x={Math.min(drawingObject.start.x, drawingObject.end.x)}
            y={Math.min(drawingObject.start.y, drawingObject.end.y)}
            width={Math.abs(drawingObject.end.x - drawingObject.start.x)}
            height={Math.abs(drawingObject.end.y - drawingObject.start.y)}
            stroke={drawingObject?.type === 'blur' ? "rgba(255,255,255,0.5)" : "#ef4444"}
            strokeWidth={drawingObject?.type === 'blur' ? 1 : 4}
            fill={drawingObject?.type === 'blur' ? "rgba(255,255,255,0.2)" : "transparent"}
            opacity={0.6}
          />
        )}
      </Layer>
    </Stage>
  );
}
