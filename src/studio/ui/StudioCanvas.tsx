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

      // Geometry and scales
      cornerRadius:    studioPreset.corner_radius,
      depth:           studioPreset.depth,
      bevel:           studioPreset.bevel,
      frameScale:      studioPreset.frame_scale,
      frameRotation:   studioPreset.frame_rotation,

      // Shadows
      shadowEnabled:   studioPreset.shadow_enabled,
      shadowIntensity: studioPreset.shadow_intensity,
      shadowAngle:     studioPreset.shadow_angle,
      shadowBlur:      studioPreset.shadow_blur,
      shadowOpacity:   studioPreset.shadow_opacity,
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
