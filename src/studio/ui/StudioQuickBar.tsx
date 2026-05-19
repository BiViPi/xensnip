import type { EditorPreset } from '../../compose/preset';
import { useStudioState } from '../state/useStudioState';
import { FrameTypePicker } from './FrameTypePicker';
import { ViewModePill } from './ViewModePill';
import { StudioBgPicker } from './StudioBgPicker';
import { StudioShadowControl } from './StudioShadowControl';
import { StudioGeometryControl } from './StudioGeometryControl';
import { PresetsControl } from '../../editor/controls/Presets';
import { Tooltip } from '../../editor/Tooltip';
import { ShadowIcon, PresetIcon } from '../../components/icons';
import { SlidersHorizontal } from 'lucide-react';
import type { Settings } from '../../ipc/types';

interface Props {
  preset: EditorPreset;
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  activePop: string | null;
  onActivePopChange: (n: string | null) => void;
  settings: Settings | null;
  onRefreshSettings: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
  onOpenPresetManager: () => void;
}

export function StudioQuickBar({
  preset,
  setPreset,
  activePop,
  onActivePopChange,
  settings,
  onRefreshSettings,
  showToast,
  onOpenPresetManager,
}: Props) {
  const {
    studioPreset,
    setFrameFamily,
    setViewMode,
    setBackgroundId,
    setFrameStyle,
    setStudioParam,
  } = useStudioState(preset, setPreset);

  const toggle = (n: string) => onActivePopChange(activePop === n ? null : n);

  return (
    <>
      <FrameTypePicker
        value={studioPreset.frame_family}
        onChange={setFrameFamily}
        activePop={activePop}
        onActivePopChange={onActivePopChange}
        frameStyle={studioPreset.frame_style}
        onFrameStyleChange={setFrameStyle}
      />
      <div className="xs-divider" />

      <StudioBgPicker
        value={studioPreset.background_id}
        onChange={setBackgroundId}
        activePop={activePop}
        onActivePopChange={onActivePopChange}
      />
      <div className="xs-divider" />

      <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
        <Tooltip text="Geometry" position="top">
          <button
            className={`xs-btn xs-icon-btn ${activePop === 'studio-geometry' ? 'active' : ''}`}
            onClick={() => toggle('studio-geometry')}
            aria-label="Geometry"
            title="Geometry"
          >
            <SlidersHorizontal size={14} strokeWidth={2} />
          </button>
        </Tooltip>
        {activePop === 'studio-geometry' && (
          <div className="xs-pop light">
            <StudioGeometryControl studioPreset={studioPreset} onChange={setStudioParam} />
          </div>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
        <Tooltip text="Shadow" position="top">
          <button
            className={`xs-btn xs-icon-btn ${activePop === 'studio-shadow' ? 'active' : ''}`}
            onClick={() => toggle('studio-shadow')}
            aria-label="Shadow"
            title="Shadow"
          >
            <ShadowIcon />
          </button>
        </Tooltip>
        {activePop === 'studio-shadow' && (
          <div className="xs-pop light">
            <StudioShadowControl studioPreset={studioPreset} onChange={setStudioParam} />
          </div>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
        <Tooltip text="Presets" position="top">
          <button
            className={`xs-btn xs-icon-btn ${activePop === 'presets' ? 'active' : ''}`}
            onClick={() => toggle('presets')}
            aria-label="Presets"
          >
            <PresetIcon />
          </button>
        </Tooltip>
        {activePop === 'presets' && (
          <div className="xs-pop">
            <PresetsControl
              preset={preset}
              settings={settings}
              onApply={p => {
                setPreset(p);
                onActivePopChange(null);
              }}
              onRefresh={onRefreshSettings}
              showToast={showToast}
              onOpenManager={() => {
                onOpenPresetManager();
                onActivePopChange(null);
              }}
            />
          </div>
        )}
      </div>

      <div className="xs-divider" />
      <ViewModePill value={studioPreset.view_mode} onChange={setViewMode} />
    </>
  );
}
