import { useRef } from 'react';
import type { EditorPreset } from '../../compose/preset';
import type { StudioExportHandle } from '../types';

interface Props {
  preset: EditorPreset;
  image: HTMLImageElement;
  onExportHandleChange: (h: StudioExportHandle | null) => void;
}

export function StudioCanvas({ preset: _preset, image: _image, onExportHandleChange: _onExportHandleChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // TODO WS4: wire useStudioRenderer
  return (
    <canvas ref={canvasRef} id="studio-canvas"
      style={{ width: '100%', height: '100%' }} />
  );
}
