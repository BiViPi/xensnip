import { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Transformer } from 'react-konva';
import { useAnnotationStore } from './state/store';
export function SelectionTransformer() {
  const { selectedId, updateObject, objects, editingTextId } = useAnnotationStore();
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectedObject = objects.find((o) => o.id === selectedId);
  const fullResizeAnchors = [
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ] as const;

  useEffect(() => {
    if (!transformerRef.current) return;

    const stage = transformerRef.current.getStage();
    if (!stage || !selectedId) {
      transformerRef.current.nodes([]);
      return;
    }

    const selectedNode = stage.findOne((node: Konva.Node) => node.id() === selectedId);
    if (!selectedNode) {
      transformerRef.current.nodes([]);
      return;
    }

    const RESIZE_DISABLED_TYPES = new Set(['text', 'numbered']);
    if (RESIZE_DISABLED_TYPES.has(selectedObject?.type || '') || editingTextId === selectedId) {
      transformerRef.current.nodes([]);
      const layer = transformerRef.current.getLayer();
      if (layer) layer.batchDraw();
      return;
    }

    transformerRef.current.nodes([selectedNode]);
    const RESIZE_ENABLED_GROUPS = new Set(['magnify', 'pixel_ruler', 'speech_bubble', 'callout']);
    if (selectedNode.className === 'Group' && !RESIZE_ENABLED_GROUPS.has(selectedObject?.type || '')) {
      transformerRef.current.enabledAnchors([]);
    } else {
      transformerRef.current.enabledAnchors([...fullResizeAnchors]);
    }
    const finalLayer = transformerRef.current.getLayer();
    if (finalLayer) finalLayer.batchDraw();
  }, [selectedId, selectedObject?.type, editingTextId, objects]);

  if (!selectedId) return null;

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    node.scaleX(1);
    node.scaleY(1);

    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return;

    if (obj.type === 'arrow' || obj.type === 'pixel_ruler') {
      const newPoints = [
        obj.points[0] * scaleX,
        obj.points[1] * scaleY,
        obj.points[2] * scaleX,
        obj.points[3] * scaleY,
      ];
      updateObject(selectedId, {
        x: node.x(),
        y: node.y(),
        rotation,
        points: newPoints as [number, number, number, number],
      });
    } else if (obj.type === 'freehand_arrow') {
      const newPoints = obj.points.map((v: number, i: number) =>
        i % 2 === 0 ? v * scaleX : v * scaleY
      );
      updateObject(selectedId, {
        x: node.x(),
        y: node.y(),
        rotation,
        points: newPoints,
      });
    } else if (obj.type === 'speech_bubble') {
      updateObject(selectedId, {
        x: node.x(),
        y: node.y(),
        rotation,
        width: obj.width * scaleX,
        height: obj.height * scaleY,
        tailX: obj.tailX * scaleX,
        tailY: obj.tailY * scaleY,
      });
    } else if (obj.type === 'callout') {
      const relTargetX = obj.targetX - obj.x;
      const relTargetY = obj.targetY - obj.y;
      updateObject(selectedId, {
        x: node.x(),
        y: node.y(),
        rotation,
        width: obj.width * scaleX,
        height: obj.height * scaleY,
        targetX: node.x() + relTargetX * scaleX,
        targetY: node.y() + relTargetY * scaleY,
      });
    } else if (obj.type === 'rectangle' || obj.type === 'blur' || obj.type === 'spotlight' || obj.type === 'magnify' || obj.type === 'simplify_ui' || obj.type === 'pixelate' || obj.type === 'opaque_redact') {
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
      anchorStroke="#6366F1"
      anchorStrokeWidth={1}
      anchorFill="#fff"
      borderStroke="#6366F1"
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
