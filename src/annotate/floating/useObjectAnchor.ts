import { useState, useEffect } from 'react';
import { useAnnotationStore } from '../state/store';

export function useObjectAnchor(stageScale: number, stageRef: React.RefObject<any>) {
  const { selectedId, objects } = useAnnotationStore();
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setAnchor(null);
      return;
    }

    const updateAnchor = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const node = stage.findOne((n: any) => n.id() === selectedId);
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
  }, [selectedId, objects, stageScale, stageRef]);

  return anchor;
}
