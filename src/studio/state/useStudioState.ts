import type { EditorPreset, StudioPreset } from '../../compose/preset';
import { DEFAULT_STUDIO_PRESET } from '../../compose/preset';
import type { FrameFamily, ViewMode, FrameStyle } from '../types';

export { DEFAULT_STUDIO_PRESET };

export function resolveStudioPreset(preset: EditorPreset): StudioPreset {
  return preset.studio ?? DEFAULT_STUDIO_PRESET;
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
} {
  const studioPreset = resolveStudioPreset(preset);

  const patch = (update: Partial<StudioPreset>) => {
    setPreset(p => ({ ...p, studio: { ...resolveStudioPreset(p), ...update } }));
  };

  return {
    studioPreset,
    setFrameFamily:  (f)  => patch({ frame_family: f }),
    setViewMode:     (v)  => patch({ view_mode: v }),
    setBackgroundId: (id) => patch({ background_id: id }),
    setFrameStyle:   (s)  => patch({ frame_style: s }),
  };
}
