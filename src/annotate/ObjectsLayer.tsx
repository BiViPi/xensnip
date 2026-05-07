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
  OpaqueRedactObject 
} from './state/types';
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
  const { objects, select, updateObject, selectedId } = useAnnotationStore();

  return (
    <>
      {objects.map((obj) => {
        if (obj.type === 'arrow') {
          return (
            <ArrowNode
              key={obj.id}
              obj={obj as ArrowObject}
              isSelected={selectedId === obj.id}
              onSelect={select}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'rectangle') {
          return (
            <RectangleNode
              key={obj.id}
              obj={obj as RectangleObject}
              isSelected={selectedId === obj.id}
              onSelect={select}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'text') {
          return (
            <TextNode
              key={obj.id}
              obj={obj as TextObject}
              isSelected={selectedId === obj.id}
              onSelect={select}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'blur') {
          return (
            <BlurNode
              key={obj.id}
              obj={obj as BlurObject}
              onSelect={select}
              onUpdate={updateObject}
              compositionCanvasRef={compositionCanvasRef}
            />
          );
        }
        if (obj.type === 'numbered') {
          return (
            <NumberedNode
              key={obj.id}
              obj={obj as NumberedObject}
              isSelected={selectedId === obj.id}
              onSelect={select}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'spotlight') {
          return (
            <SpotlightNode
              key={obj.id}
              obj={obj as SpotlightObject}
              isSelected={selectedId === obj.id}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              onSelect={select}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'magnify') {
          return (
            <MagnifyNode
              key={obj.id}
              obj={obj as MagnifyObject}
              isSelected={selectedId === obj.id}
              onSelect={select}
              onUpdate={updateObject}
              compositionCanvasRef={compositionCanvasRef}
            />
          );
        }
        if (obj.type === 'simplify_ui') {
          return (
            <SimplifyUiNode
              key={obj.id}
              obj={obj as SimplifyUiObject}
              isSelected={selectedId === obj.id}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              onSelect={select}
              onUpdate={updateObject}
              compositionCanvasRef={compositionCanvasRef}
            />
          );
        }
        if (obj.type === 'pixel_ruler') {
          return (
            <PixelRulerNode
              key={obj.id}
              obj={obj as PixelRulerObject}
              isSelected={selectedId === obj.id}
              onSelect={() => select(obj.id)}
              onChange={(attrs) => updateObject(obj.id, attrs)}
              scale={scale}
            />
          );
        }
        if (obj.type === 'speech_bubble') {
          return (
            <SpeechBubbleNode
              key={obj.id}
              obj={obj as SpeechBubbleObject}
              isSelected={selectedId === obj.id}
              onSelect={() => select(obj.id)}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'callout') {
          return (
            <CalloutNode
              key={obj.id}
              obj={obj as CalloutObject}
              onSelect={() => select(obj.id)}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'freehand_arrow') {
          return (
            <FreehandArrowNode
              key={obj.id}
              obj={obj as FreehandArrowObject}
              onSelect={() => select(obj.id)}
              onUpdate={updateObject}
            />
          );
        }
        if (obj.type === 'pixelate') {
          return (
            <PixelateNode
              key={obj.id}
              obj={obj as PixelateObject}
              onSelect={select}
              onUpdate={updateObject}
              compositionCanvasRef={compositionCanvasRef}
            />
          );
        }
        if (obj.type === 'opaque_redact') {
          return (
            <OpaqueRedactNode
              key={obj.id}
              obj={obj as OpaqueRedactObject}
              onSelect={select}
              onUpdate={updateObject}
            />
          );
        }
        return null;
      })}
    </>
  );
}
