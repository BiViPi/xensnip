import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import { useAnnotationStore } from './state/store';
import { ArrowObject } from './state/types';

export function SelectionTransformer() {
  const { selectedId, updateObject, objects, editingTextId } = useAnnotationStore();
  const transformerRef = useRef<any>(null);
  const selectedObject = objects.find((o) => o.id === selectedId);

  useEffect(() => {
    if (!transformerRef.current) return;

    const stage = transformerRef.current.getStage();
    if (!selectedId) {
      transformerRef.current.nodes([]);
      return;
    }

    const selectedNode = stage.findOne((node: any) => node.id() === selectedId);
    if (!selectedNode) {
      transformerRef.current.nodes([]);
      return;
    }

    if (selectedObject?.type === 'text' || selectedObject?.type === 'numbered' || editingTextId === selectedId) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
      return;
    }

    transformerRef.current.nodes([selectedNode]);
    if (selectedNode.className === 'Group') {
      transformerRef.current.enabledAnchors([]);
    } else {
      transformerRef.current.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
    }
    transformerRef.current.getLayer().batchDraw();
  }, [selectedId, selectedObject?.type, editingTextId, objects]);

  if (!selectedId) return null;

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    node.scaleX(1);
    node.scaleY(1);

    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return;

    if (obj.type === 'arrow') {
      const arrowObj = obj as ArrowObject;
      const newPoints = [
        arrowObj.points[0] * scaleX,
        arrowObj.points[1] * scaleY,
        arrowObj.points[2] * scaleX,
        arrowObj.points[3] * scaleY,
      ];
      updateObject(selectedId, {
        x: node.x(),
        y: node.y(),
        rotation,
        points: newPoints as [number, number, number, number],
      });
    } else if (obj.type === 'rectangle' || obj.type === 'blur') {
      updateObject(selectedId, {
        x: node.x(),
        y: node.y(),
        rotation,
        width: node.width() * scaleX,
        height: node.height() * scaleY,
      });
    }
  };

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={false}
      anchorSize={8}
      anchorCornerRadius={2}
      anchorStroke="#3b82f6"
      anchorStrokeWidth={1}
      anchorFill="#fff"
      borderStroke="#3b82f6"
      borderDash={[4, 3]}
      padding={4}
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
          return oldBox;
        }
        return newBox;
      }}
      onTransformEnd={handleTransformEnd}
    />
  );
}
