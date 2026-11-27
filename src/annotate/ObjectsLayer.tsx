import { Fragment, useCallback, useMemo, useState } from 'react';
import Konva from 'konva';
import { Image } from 'react-konva';
import { useAnnotationStore } from './state/store';
import { ArrowNode } from './objects/ArrowNode';
import { RectangleNode } from './objects/RectangleNode';
import { TextNode } from './objects/TextNode';
import { BlurNode } from './objects/BlurNode';
import { NumberedNode } from './objects/NumberedNode';
import { SpotlightNode } from './objects/SpotlightNode';
import { MagnifyNode } from './objects/MagnifyNode';
import { SimplifyUiNode } from './objects/SimplifyUiNode';
import { PixelRulerNode } from './objects/PixelRulerNode';
import { SpeechBubbleNode } from './objects/SpeechBubbleNode';
import { CalloutNode } from './objects/CalloutNode';
import { FreehandArrowNode } from './objects/FreehandArrowNode';
import { PixelateNode } from './objects/PixelateNode';
import { OpaqueRedactNode } from './objects/OpaqueRedactNode';
import { renderSpotlightMaskCanvas, type SpotlightMaskItem } from './renderers/SpotlightRenderer';

interface Props {
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageWidth: number;
  stageHeight: number;
  scale: number;
  canvasRevision?: number;
  previewSpotlight?: SpotlightMaskItem | null;
}

export function ObjectsLayer({
  compositionCanvasRef,
  stageWidth,
  stageHeight,
  scale,
  canvasRevision = 0,
  previewSpotlight = null,
}: Props) {
  const { objects, select, toggleSelect, updateObject, selectedIds, activeTool } = useAnnotationStore();
  const [spotlightDragMap, setSpotlightDragMap] = useState<Record<string, { x: number; y: number }>>({});

  const handleSpotlightDragPreview = useCallback((id: string, pos: { x: number; y: number } | null) => {
    setSpotlightDragMap((prev) => {
      if (!pos) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: pos };
    });
  }, []);

  const handleSelect = (id: string | null, e?: Konva.KonvaEventObject<any>) => {
    if (!id) {
      select(null);
      return;
    }
    if (e?.evt?.ctrlKey || e?.evt?.metaKey) {
      toggleSelect(id);
    } else {
      select(id);
    }
  };

  let lastSpotlightIndex = -1;
  const effectiveSpotlights: SpotlightMaskItem[] = [];
  for (let i = 0; i < objects.length; i++) {
    const item = objects[i];
    if (item.type === 'spotlight') {
      lastSpotlightIndex = i;
      const dragOverride = spotlightDragMap[item.id];
      effectiveSpotlights.push(
        dragOverride
          ? { ...item, x: dragOverride.x, y: dragOverride.y }
          : item
      );
    }
  }
  if (previewSpotlight) {
    effectiveSpotlights.push(previewSpotlight);
  }

  const spotlightMaskCanvas = useMemo(
    () => renderSpotlightMaskCanvas(effectiveSpotlights, stageWidth, stageHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stageWidth, stageHeight, JSON.stringify(effectiveSpotlights)]
  );

  return (
    <>
      {objects.map((obj, idx) => {
        if (obj.type === 'arrow') {
          return (
            <ArrowNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={handleSelect}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'rectangle') {
          return (
            <RectangleNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={handleSelect}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'text') {
          return (
            <TextNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={handleSelect}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'blur') {
          return (
            <BlurNode
              key={obj.id}
              obj={obj}
              onSelect={handleSelect}
              onUpdate={updateObject}
              compositionCanvasRef={compositionCanvasRef}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              canvasRevision={canvasRevision}
            />
          );
        }
        if (obj.type === 'numbered') {
          return (
            <NumberedNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={handleSelect}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'spotlight') {
          const showSharedMaskHere =
            (!previewSpotlight && idx === lastSpotlightIndex && spotlightMaskCanvas);
          const isSelected = selectedIds.includes(obj.id);
          return (
            <Fragment key={obj.id}>
              {showSharedMaskHere && (
                <Image
                  listening={false}
                  x={0}
                  y={0}
                  width={stageWidth}
                  height={stageHeight}
                  image={spotlightMaskCanvas}
                />
              )}
              <SpotlightNode
                obj={obj}
                isSelected={isSelected}
                interiorInteractive={isSelected || activeTool === 'select'}
                onSelect={handleSelect}
                onUpdate={updateObject}
                onDragPreview={handleSpotlightDragPreview}
              />
            </Fragment>
          );
        }
        if (obj.type === 'magnify') {
          return (
            <MagnifyNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={handleSelect}
              onUpdate={updateObject}
              compositionCanvasRef={compositionCanvasRef}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              canvasRevision={canvasRevision}
            />
          );
        }
        if (obj.type === 'simplify_ui') {
          return (
            <SimplifyUiNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              canvasRevision={canvasRevision}
              onSelect={handleSelect}
              onUpdate={updateObject}
              compositionCanvasRef={compositionCanvasRef}
            />
          );
        }
        if (obj.type === 'pixel_ruler') {
          return (
            <PixelRulerNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={(e) => handleSelect(obj.id, e)}
              onChange={(attrs: any) => updateObject(obj.id, attrs)}
              scale={scale}
            />
          );
        }
        if (obj.type === 'speech_bubble') {
          return (
            <SpeechBubbleNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={(e) => handleSelect(obj.id, e)}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'callout') {
          return (
            <CalloutNode
              key={obj.id}
              obj={obj}
              onSelect={(e) => handleSelect(obj.id, e)}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'freehand_arrow') {
          return (
            <FreehandArrowNode
              key={obj.id}
              obj={obj}
              onSelect={(e) => handleSelect(obj.id, e)}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'pixelate') {
          return (
            <PixelateNode
              key={obj.id}
              obj={obj}
              onSelect={handleSelect}
              onUpdate={updateObject}
              compositionCanvasRef={compositionCanvasRef}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              canvasRevision={canvasRevision}
            />
          );
        }
        if (obj.type === 'opaque_redact') {
          return (
            <OpaqueRedactNode
              key={obj.id}
              obj={obj}
              onSelect={handleSelect}
              onUpdate={updateObject}
            />
          );
        }
        return null;
      })}
      {previewSpotlight && spotlightMaskCanvas && (
        <Image
          listening={false}
          x={0}
          y={0}
          width={stageWidth}
          height={stageHeight}
          image={spotlightMaskCanvas}
        />
      )}
    </>
  );
}
