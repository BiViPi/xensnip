import type { EditorPreset, StudioPreset } from '../../compose/preset';
import { DEFAULT_STUDIO_PRESET } from '../../compose/preset';
import type { FrameFamily, ViewMode, FrameStyle } from '../types';
import { getBackground } from '@studio-impl/backgrounds';

export { DEFAULT_STUDIO_PRESET };

export function resolveStudioPreset(preset: EditorPreset): StudioPreset {
  return preset.studio ? { ...DEFAULT_STUDIO_PRESET, ...preset.studio } : DEFAULT_STUDIO_PRESET;
}

export function useStudioState(
  preset: EditorPreset,
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void,
): {
  studioPreset:    StudioPreset;
  setFrameFamily:  (f: FrameFamily) => void;
  setViewMode:     (v: ViewMode) => void;
  setBackgroundId: (id: string) => void;
  setFrameStyle:   (s: FrameStyle) => void;
  setStudioParam:  <K extends keyof StudioPreset>(key: K, value: StudioPreset[K]) => void;
} {
  const studioPreset = resolveStudioPreset(preset);

  const patch = (update: Partial<StudioPreset>) => {
    setPreset(p => ({ ...p, studio: { ...resolveStudioPreset(p), ...update } }));
  };

  return {
    studioPreset,
    setFrameFamily:  (f)  => patch({ frame_family: f }),
    setViewMode:     (v)  => patch({ view_mode: v }),
    setBackgroundId: (id) => {
      const currentBg = getBackground(studioPreset.background_id);
      const newBg = getBackground(id);
      const isIntensityDefault = studioPreset.shadow_intensity === currentBg.shadow.intensity;
      const isAngleDefault = studioPreset.shadow_angle === currentBg.shadow.angle;
      const isOpacityDefault = studioPreset.shadow_opacity === currentBg.shadow.intensity;

      const updates: Partial<StudioPreset> = { background_id: id };
      if (isIntensityDefault) updates.shadow_intensity = newBg.shadow.intensity;
      if (isAngleDefault) updates.shadow_angle = newBg.shadow.angle;
      if (isOpacityDefault) updates.shadow_opacity = newBg.shadow.intensity;
      patch(updates);
    },
    setFrameStyle:   (s)  => patch({ frame_style: s }),
    setStudioParam:  (key, value) => patch({ [key]: value }),
  };
}
