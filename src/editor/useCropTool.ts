import { useState, useCallback } from 'react';
import { EditorPreset } from '../compose/preset';
import { useAnnotationStore } from '../annotate/state/store';

export function useCropTool(
  image: HTMLImageElement | null,
  _preset: EditorPreset,
  setImage: (img: HTMLImageElement) => void,
  setActiveTool: (tool: any) => void
) {
  const { objects, clearAll } = useAnnotationStore();
  const [cropBounds, setCropBounds] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const startCrop = useCallback(() => {
    if (!image) return;
    // Initial crop bounds = current image size (composition space)
    setCropBounds({ x: 0, y: 0, w: image.width, h: image.height });
  }, [image]);

  const cancelCrop = useCallback(() => {
    setCropBounds(null);
    setActiveTool('select');
  }, [setActiveTool]);

  const commitCrop = useCallback(async () => {
    if (!image || !cropBounds) return;

    // If annotations exist, confirm first (caller handles this)
    
    // Create new image from cropped region
    const canvas = document.createElement('canvas');
    canvas.width = cropBounds.w;
    canvas.height = cropBounds.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      cropBounds.x, cropBounds.y, cropBounds.w, cropBounds.h,
      0, 0, cropBounds.w, cropBounds.h
    );

    const newImg = new Image();
    newImg.src = canvas.toDataURL('image/png');
    await new Promise((resolve) => {
      newImg.onload = resolve;
    });

    setImage(newImg);
    clearAll(); // Annotation coords are now invalid
    setCropBounds(null);
    setActiveTool('select');
  }, [image, cropBounds, setImage, clearAll, setActiveTool]);

  return {
    cropBounds,
    setCropBounds,
    startCrop,
    cancelCrop,
    commitCrop,
    hasAnnotations: objects.length > 0
  };
}
