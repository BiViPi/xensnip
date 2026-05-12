import Konva from 'konva';
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

interface Props {
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageWidth: number;
  stageHeight: number;
  scale: number;
}

export function ObjectsLayer({ compositionCanvasRef, stageWidth, stageHeight, scale }: Props) {
  const { objects, select, toggleSelect, updateObject, selectedIds } = useAnnotationStore();

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

  return (
    <>
      {objects.map((obj) => {
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
          return (
            <SpotlightNode
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              onSelect={handleSelect}
              onUpdate={updateObject}
            />
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
    </>
  );
}
