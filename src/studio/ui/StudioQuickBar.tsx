import type { EditorPreset } from '../../compose/preset';
import { useStudioState } from '../state/useStudioState';
import { FrameTypePicker } from './FrameTypePicker';
import { ViewModePill } from './ViewModePill';
import { StudioBgPicker } from './StudioBgPicker';
import { FrameStylePicker } from './FrameStylePicker';

interface Props {
  preset: EditorPreset;
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  activePop: string | null;
  onActivePopChange: (n: string | null) => void;
}

export function StudioQuickBar({ preset, setPreset, activePop, onActivePopChange }: Props) {
  const { studioPreset, setFrameFamily, setViewMode, setBackgroundId, setFrameStyle } =
    useStudioState(preset, setPreset);

  return (
    <>
      <FrameTypePicker value={studioPreset.frame_family} onChange={setFrameFamily} />
      <div className="xs-divider" />
      <FrameStylePicker value={studioPreset.frame_style} onChange={setFrameStyle} />
      <StudioBgPicker
        value={studioPreset.background_id}
        onChange={setBackgroundId}
        activePop={activePop}
        onActivePopChange={onActivePopChange}
      />
      <div className="xs-divider" />
      <ViewModePill value={studioPreset.view_mode} onChange={setViewMode} />
    </>
  );
}
