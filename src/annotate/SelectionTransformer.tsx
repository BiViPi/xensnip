import { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Transformer } from 'react-konva';
import { useAnnotationStore } from './state/store';
import { recordHistorySnapshot, withHistorySuspended } from '../editor/historyBridge';
export function SelectionTransformer() {
  const { selectedIds, updateObject, objects, editingTextId } = useAnnotationStore();
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
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
    if (!stage || selectedIds.length === 0) {
      transformerRef.current.nodes([]);
      return;
    }

    const selectedNodes = selectedIds.map(id => stage.findOne((node: Konva.Node) => node.id() === id)).filter(Boolean) as Konva.Node[];
    if (selectedNodes.length === 0) {
      transformerRef.current.nodes([]);
      return;
    }

    const RESIZE_DISABLED_TYPES = new Set(['text', 'numbered']);
    const hasDisabledType = selectedObjects.some(o => RESIZE_DISABLED_TYPES.has(o.type));
    if (hasDisabledType || selectedIds.includes(editingTextId || '')) {
      transformerRef.current.nodes([]);
      const layer = transformerRef.current.getLayer();
      if (layer) layer.batchDraw();
      return;
    }

    transformerRef.current.nodes(selectedNodes);
    const RESIZE_ENABLED_GROUPS = new Set(['magnify', 'pixel_ruler', 'speech_bubble', 'callout']);
    // Only allow resizing groups if single selection and enabled group type
    const isSingleEnabledGroup = selectedNodes.length === 1 && selectedNodes[0].className === 'Group' && RESIZE_ENABLED_GROUPS.has(selectedObjects[0]?.type || '');
    const isMultiOrNonGroup = selectedNodes.length > 1 || selectedNodes[0].className !== 'Group';
    
    if (isSingleEnabledGroup || isMultiOrNonGroup) {
      transformerRef.current.enabledAnchors([...fullResizeAnchors]);
    } else {
      transformerRef.current.enabledAnchors([]);
    }
    const finalLayer = transformerRef.current.getLayer();
    if (finalLayer) finalLayer.batchDraw();
  }, [selectedIds, objects, editingTextId]);

  if (selectedIds.length === 0) return null;

  const handleTransformEnd = () => {
    if (!transformerRef.current) return;
    const nodes = transformerRef.current.nodes();

    if (nodes.length === 0) return;

    recordHistorySnapshot();
    withHistorySuspended(() => {
      nodes.forEach(node => {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();

        node.scaleX(1);
        node.scaleY(1);

        const obj = objects.find((o) => o.id === node.id());
        if (!obj) return;

        if (obj.type === 'arrow' || obj.type === 'pixel_ruler') {
          const newPoints = [
            obj.points[0] * scaleX,
            obj.points[1] * scaleY,
            obj.points[2] * scaleX,
            obj.points[3] * scaleY,
          ];
          updateObject(node.id(), {
            x: node.x(),
            y: node.y(),
            rotation,
            points: newPoints as [number, number, number, number],
          });
        } else if (obj.type === 'freehand_arrow') {
          const newPoints = obj.points.map((v: number, i: number) =>
            i % 2 === 0 ? v * scaleX : v * scaleY
          );
          updateObject(node.id(), {
            x: node.x(),
            y: node.y(),
            rotation,
            points: newPoints,
          });
        } else if (obj.type === 'speech_bubble') {
          updateObject(node.id(), {
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
          updateObject(node.id(), {
            x: node.x(),
            y: node.y(),
            rotation,
            width: obj.width * scaleX,
            height: obj.height * scaleY,
            targetX: node.x() + relTargetX * scaleX,
            targetY: node.y() + relTargetY * scaleY,
          });
        } else if (obj.type === 'rectangle' || obj.type === 'blur' || obj.type === 'spotlight' || obj.type === 'magnify' || obj.type === 'simplify_ui' || obj.type === 'pixelate' || obj.type === 'opaque_redact') {
          updateObject(node.id(), {
            x: node.x(),
            y: node.y(),
            rotation,
            width: node.width() * scaleX,
            height: node.height() * scaleY,
          });
        }
      });
    });
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
