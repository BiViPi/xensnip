import { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Stage, Layer, Arrow, Rect } from 'react-konva';
import { useAnnotationStore } from './state/store';
import { ObjectsLayer } from './ObjectsLayer';
import { SelectionTransformer } from './SelectionTransformer';
import { getSpotlightCornerRadius } from './renderers/spotlightLayout';
import { useMeasureStore } from '../measure/store';
import { GridOverlay } from '../measure/GridOverlay';
import { OCRResultToolbar } from '../measure/OCRResultToolbar';
import { usePrivacyStore } from '../privacy/store';
import { SmartRedactToolbar } from '../privacy/SmartRedactToolbar';
import { SmartRedactOverlay } from '../privacy/SmartRedactOverlay';
import { useAnnotationPointerHandlers } from './useAnnotationPointerHandlers';
import { TextInlineEditor } from './TextInlineEditor';

interface AnnotationStageProps {
  width: number;
  height: number;
  scale: number;
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
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
  pixelate: 'crosshair',
  opaque_redact: 'crosshair',
  crop: 'default',
  canvas: 'default',
};

export function AnnotationStage({ width, height, scale, compositionCanvasRef, stageRef }: AnnotationStageProps) {
  const { activeTool, objects, editingTextId, setEditingTextId, updateObject } = useAnnotationStore();
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
  const {
    setStatus: setPrivacyStatus,
    setSelectionRect,
    setScope,
    reset: resetPrivacy,
  } = usePrivacyStore();

  const ocrRequestIdRef = useRef<number>(0);
  const stageWidth = width / scale;
  const stageHeight = height / scale;

  const overlay = document.getElementById('annotation-ui-overlay');

  useEffect(() => {
    if (activeUtility === 'ocr_extract') return;

    ocrRequestIdRef.current += 1;
    setOcrRegion(null);
    setOcrStatus('idle');
    setOcrText('');
    setOcrError(null);

    if (activeUtility !== 'smart_redact_ai') {
      resetPrivacy();
    }
  }, [activeUtility, setOcrError, setOcrRegion, setOcrStatus, setOcrText, resetPrivacy]);

  const dismissOcrResult = () => {
    ocrRequestIdRef.current += 1;
    setOcrRegion(null);
    setOcrStatus('idle');
    setOcrText('');
    setOcrError(null);
  };

  const closeTextEditor = (value: string) => {
    if (!editingTextId) return;
    updateObject(editingTextId, { text: value || 'Type here...' });
    setEditingTextId(null);
  };

  const { handleMouseDown, handleMouseMove, handleMouseUp, drawingObject } =
    useAnnotationPointerHandlers({
      scale,
      compositionCanvasRef,
      activeUtility,
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
    });

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
                drawingObject.end.y - drawingObject.start.y,
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
                drawingObject.end.y - drawingObject.start.y,
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

          {(drawingObject?.type === 'rectangle' || drawingObject?.type === 'blur' || drawingObject?.type === 'pixelate' || drawingObject?.type === 'opaque_redact' || drawingObject?.type === 'magnify' || drawingObject?.type === 'simplify_ui' || drawingObject?.type === 'ocr_selection' || drawingObject?.type === 'smart_redact_selection') && (
            <Rect
              x={Math.min(drawingObject.start.x, drawingObject.end.x)}
              y={Math.min(drawingObject.start.y, drawingObject.end.y)}
              width={Math.abs(drawingObject.end.x - drawingObject.start.x)}
              height={Math.abs(drawingObject.end.y - drawingObject.start.y)}
              stroke={
                drawingObject?.type === 'blur' || drawingObject?.type === 'simplify_ui' || drawingObject?.type === 'pixelate'
                  ? "rgba(255,255,255,0.5)"
                  : (drawingObject?.type === 'ocr_selection' || drawingObject?.type === 'smart_redact_selection' ? "#fbbf24" : (drawingObject?.type === 'opaque_redact' ? "#000000" : "#ef4444"))
              }
              strokeWidth={drawingObject?.type === 'blur' || drawingObject?.type === 'simplify_ui' || drawingObject?.type === 'pixelate' ? 1 : (drawingObject?.type === 'ocr_selection' || drawingObject?.type === 'smart_redact_selection' ? 2 : 4)}
              fill={
                drawingObject?.type === 'blur' || drawingObject?.type === 'simplify_ui' || drawingObject?.type === 'pixelate'
                  ? "rgba(255,255,255,0.2)"
                  : (drawingObject?.type === 'ocr_selection' || drawingObject?.type === 'smart_redact_selection' ? "rgba(251, 191, 36, 0.1)" : (drawingObject?.type === 'opaque_redact' ? "#000000" : "transparent"))
              }
              dash={drawingObject?.type === 'ocr_selection' || drawingObject?.type === 'smart_redact_selection' ? [4, 4] : undefined}
              opacity={drawingObject?.type === 'opaque_redact' ? 1 : 0.6}
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
      <TextInlineEditor
        editingTextId={editingTextId}
        objects={objects}
        overlay={overlay}
        scale={scale}
        onClose={closeTextEditor}
        onCancel={() => setEditingTextId(null)}
      />
      <OCRResultToolbar onDismiss={dismissOcrResult} scale={scale} />
      {activeUtility === 'smart_redact_ai' && (
        <>
          <SmartRedactToolbar compositionCanvasRef={compositionCanvasRef} />
          <SmartRedactOverlay scale={scale} />
        </>
      )}
    </>
  );
}
