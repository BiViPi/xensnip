import { useAnnotationStore } from './state/store';
import { ArrowNode } from './objects/ArrowNode';
import { RectangleNode } from './objects/RectangleNode';
import { TextNode } from './objects/TextNode';
import { BlurNode } from './objects/BlurNode';
import { NumberedNode } from './objects/NumberedNode';
import { SpotlightNode } from './objects/SpotlightNode';

interface Props {
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageWidth: number;
  stageHeight: number;
}

export function ObjectsLayer({ compositionCanvasRef, stageWidth, stageHeight }: Props) {
  const { objects, select, updateObject, selectedId } = useAnnotationStore();

  return (
    <>
      {objects.map((obj) => {
        if (obj.type === 'arrow') {
          return (
            <ArrowNode
              key={obj.id}
              obj={obj}
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
              obj={obj}
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
              obj={obj as any}
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
              obj={obj as any}
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
              obj={obj as any}
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
              obj={obj as any}
              isSelected={selectedId === obj.id}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
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
