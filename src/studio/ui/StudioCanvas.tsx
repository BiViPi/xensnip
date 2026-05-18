import { useMemo, useRef } from 'react';
import type { EditorPreset } from '../../compose/preset';
import type { StudioExportHandle, StudioRenderConfig } from '../types';
import { resolveStudioPreset } from '../state/useStudioState';
import { useStudioRenderer } from '@studio-impl/renderer/useStudioRenderer';
import { getBackground } from '@studio-impl/backgrounds';

interface Props {
  preset: EditorPreset;
  image: HTMLImageElement;
  onExportHandleChange: (h: StudioExportHandle | null) => void;
}

export function StudioCanvas({ preset, image, onExportHandleChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = useMemo<StudioRenderConfig>(() => {
    const studioPreset = resolveStudioPreset(preset);
    const background = getBackground(studioPreset.background_id);
    return {
      frameFamily:     studioPreset.frame_family,
      frameStyle:      studioPreset.frame_style,
      viewMode:        studioPreset.view_mode,
      background,
      screenshotImage: image,
    };
  }, [image, preset]);

  useStudioRenderer(canvasRef, config, onExportHandleChange);

  return (
    <canvas
      ref={canvasRef}
      id="studio-canvas"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
