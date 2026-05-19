import { useMemo, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { EditorPreset } from '../../compose/preset';
import type { StudioExportHandle, StudioRenderConfig } from '../types';
import { resolveStudioPreset } from '../state/useStudioState';
import { useStudioRenderer } from '@studio-impl/renderer/useStudioRenderer';
import { getBackground } from '@studio-impl/backgrounds';
import { Move } from 'lucide-react';

interface Props {
  preset: EditorPreset;
  image: HTMLImageElement;
  onExportHandleChange: (h: StudioExportHandle | null) => void;
  onPresetChange: (preset: EditorPreset) => void;
}

const OFFSET_LIMIT = 0.42;

export function StudioCanvas({ preset, image, onExportHandleChange, onPresetChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef(preset);
  const dragStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const studioPreset = resolveStudioPreset(preset);
  presetRef.current = preset;
  const config = useMemo<StudioRenderConfig>(() => {
    const background = getBackground(studioPreset.background_id);
    return {
      frameFamily:     studioPreset.frame_family,
      frameStyle:      studioPreset.frame_style,
      viewMode:        'Front',
      background,
      screenshotImage: image,

      // Geometry and scales
      cornerRadius:    studioPreset.corner_radius,
      depth:           studioPreset.depth,
      bevel:           studioPreset.bevel,
      frameScale:      studioPreset.frame_scale,
      frameRotation:   studioPreset.frame_rotation,
      frameOffsetX:    studioPreset.frame_offset_x,
      frameOffsetY:    studioPreset.frame_offset_y,

      // Shadows
      shadowEnabled:   studioPreset.shadow_enabled,
      shadowIntensity: studioPreset.shadow_intensity,
      shadowAngle:     studioPreset.shadow_angle,
      shadowBlur:      studioPreset.shadow_blur,
      shadowOpacity:   studioPreset.shadow_opacity,
    };
  }, [image, studioPreset]);

  useStudioRenderer(canvasRef, config, onExportHandleChange);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const shell = shellRef.current;
    if (!shell) return;
    const rect = shell.getBoundingClientRect();
    dragStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: studioPreset.frame_offset_x,
      startOffsetY: studioPreset.frame_offset_y,
      width: Math.max(rect.width, 1),
      height: Math.max(rect.height, 1),
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      const nextOffsetX = Math.max(
        -OFFSET_LIMIT,
        Math.min(OFFSET_LIMIT, drag.startOffsetX + (moveEvent.clientX - drag.startClientX) / drag.width),
      );
      const nextOffsetY = Math.max(
        -OFFSET_LIMIT,
        Math.min(OFFSET_LIMIT, drag.startOffsetY + (moveEvent.clientY - drag.startClientY) / drag.height),
      );

      onPresetChange({
        ...presetRef.current,
        studio: {
          ...resolveStudioPreset(presetRef.current),
          frame_offset_x: nextOffsetX,
          frame_offset_y: nextOffsetY,
        },
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div ref={shellRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        id="studio-canvas"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <button
        type="button"
        onPointerDown={handlePointerDown}
        aria-label="Move frame"
        title="Move frame"
        style={{
          position: 'absolute',
          left: `calc(50% + ${studioPreset.frame_offset_x * 100}%)`,
          top: `calc(50% + ${studioPreset.frame_offset_y * 100}%)`,
          transform: 'translate(-50%, -50%)',
          width: '34px',
          height: '34px',
          borderRadius: '999px',
          border: '1px solid rgba(148, 163, 184, 0.28)',
          background: 'rgba(255, 255, 255, 0.72)',
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
          backdropFilter: 'blur(10px)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
          color: '#334155',
          zIndex: 3,
        }}
      >
        <Move size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
