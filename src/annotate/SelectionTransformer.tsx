import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import { useAnnotationStore } from './state/store';
import { ArrowObject } from './state/types';

export function SelectionTransformer() {
  const { selectedId, updateObject, objects } = useAnnotationStore();
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (transformerRef.current) {
      const stage = transformerRef.current.getStage();
      if (!selectedId) {
        transformerRef.current.nodes([]);
        return;
      }

      const selectedNode = stage.findOne((node: any) => node.id() === selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        if (selectedNode.className === 'Text' || selectedNode.className === 'Group') {
          transformerRef.current.enabledAnchors([]);
        } else {
          transformerRef.current.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
        }
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId, objects]);

  if (!selectedId) return null;

  const handleTransform = (e: any) => {
    const node = e.target;
    const tr = transformerRef.current;
    if (!tr) return;

    const anchor = tr.getActiveAnchor();

    // tr and bl for Rotate
    if (anchor === 'top-right' || anchor === 'bottom-left') {
      const stage = node.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const center = {
        x: node.x() + (node.width() / 2) * Math.cos(node.rotation() * Math.PI / 180) - (node.height() / 2) * Math.sin(node.rotation() * Math.PI / 180),
        y: node.y() + (node.width() / 2) * Math.sin(node.rotation() * Math.PI / 180) + (node.height() / 2) * Math.cos(node.rotation() * Math.PI / 180)
      };

      // Simpler way: just get absolute center
      const box = node.getClientRect({ skipTransform: false });
      const absCenter = {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      };

      const angle = Math.atan2(pointer.y - absCenter.y, pointer.x - absCenter.x) * 180 / Math.PI;

      // Adjust angle based on which anchor is used
      let finalAngle = angle;
      if (anchor === 'top-right') finalAngle -= 0; // tr is roughly 0 deg from center-right? No, tr is top-right.
      // We want the relative change.

      node.rotation(finalAngle);

      // Cancel scaling
      node.scaleX(1);
      node.scaleY(1);
    }
  };

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    const obj = objects.find(o => o.id === selectedId);
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
        rotation: rotation,
        points: newPoints as [number, number, number, number]
      });
    } else if (obj.type === 'rectangle' || obj.type === 'blur') {
      updateObject(selectedId, {
        x: node.x(),
        y: node.y(),
        rotation: rotation,
        width: node.width() * scaleX,
        height: node.height() * scaleY
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
      anchorStyleFunc={(anchor: any) => {
        const name = anchor.getName();
        if (name === 'top-right' || name === 'bottom-left') {
          anchor.cursor('crosshair');
        }
      }}
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8) {
          return oldBox;
        }
        return newBox;
      }}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
    />
  );
}
