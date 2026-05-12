import { useState, useEffect } from 'react';
import Konva from 'konva';
import { useAnnotationStore } from '../state/store';

export function useObjectAnchor(stageScale: number, stageRef: React.RefObject<Konva.Stage | null>) {
  const { selectedIds, objects } = useAnnotationStore();
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (selectedIds.length !== 1) {
      setAnchor(null);
      return;
    }
    const selectedId = selectedIds[0];

    const updateAnchor = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const node = stage.findOne((n: Konva.Node) => n.id() === selectedId);
      if (node) {
        const box = node.getClientRect();
        setAnchor({
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height
        });
      }
    };

    const interval = setInterval(updateAnchor, 16); // Follow movement
    return () => clearInterval(interval);
  }, [selectedIds, objects, stageScale, stageRef]);

  return anchor;
}
