import type { EditorPreset } from '../../compose/preset';

interface Props {
  preset: EditorPreset;
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  activePop: string | null;
  onActivePopChange: (n: string | null) => void;
}

export function StudioQuickBar(_props: Props) {
  // TODO WS5: implement FrameTypePicker, ViewModePill, StudioBgPicker, FrameStylePicker
  return (
    <span style={{ fontSize: '12px', opacity: 0.5, padding: '0 8px' }}>
      2.5D Studio
    </span>
  );
}
