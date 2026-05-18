import type { EditorPreset, StudioPreset } from '../../compose/preset';
import { DEFAULT_STUDIO_PRESET } from '../../compose/preset';
import type { FrameFamily, ViewMode, FrameStyle } from '../types';

export { DEFAULT_STUDIO_PRESET };

export function resolveStudioPreset(preset: EditorPreset): StudioPreset {
  return preset.studio ?? DEFAULT_STUDIO_PRESET;
}

export function useStudioState(
  _preset: EditorPreset,
  _setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void,
): {
  studioPreset:    StudioPreset;
  setFrameFamily:  (f: FrameFamily) => void;
  setViewMode:     (v: ViewMode) => void;
  setBackgroundId: (id: string) => void;
  setFrameStyle:   (s: FrameStyle) => void;
} {
  // TODO WS5
  return {
    studioPreset:    DEFAULT_STUDIO_PRESET,
    setFrameFamily:  () => {},
    setViewMode:     () => {},
    setBackgroundId: () => {},
    setFrameStyle:   () => {},
  };
}
