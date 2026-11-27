import { useState, useEffect } from 'react';
import Konva from 'konva';
import { useAnnotationStore } from '../state/store';

export function useObjectAnchor(stageScale: number, stageRef: React.RefObject<Konva.Stage | null>) {
  const { selectedIds, objects } = useAnnotationStore();
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setAnchor(null);
      return;
    }

    const updateAnchor = () => {
      const stage = stageRef.current;
      if (!stage) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let found = false;

      for (const selectedId of selectedIds) {
        const node = stage.findOne((n: Konva.Node) => n.id() === selectedId);
        if (!node) continue;
        const box = node.getClientRect({ skipShadow: true });
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
        found = true;
      }

      if (found) {
        const width = maxX - minX;
        const height = maxY - minY;
        setAnchor((prev) =>
          prev &&
          prev.left === minX &&
          prev.top === minY &&
          prev.width === width &&
          prev.height === height
            ? prev
            : { left: minX, top: minY, width, height }
        );
      } else {
        setAnchor(null);
      }
    };

    updateAnchor();
    const interval = setInterval(updateAnchor, 16);
    return () => clearInterval(interval);
  }, [selectedIds, objects, stageScale, stageRef]);

  return anchor;
}
