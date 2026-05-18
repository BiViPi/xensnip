import type { EditorPreset } from '../../compose/preset';
import { useStudioState } from '../state/useStudioState';
import { FrameTypePicker } from './FrameTypePicker';
import { ViewModePill } from './ViewModePill';
import { StudioBgPicker } from './StudioBgPicker';
import { FrameStylePicker } from './FrameStylePicker';
import { StudioSlider } from './StudioSlider';
import { Tooltip } from '../../editor/Tooltip';
import { ShadowIcon } from '../../components/icons';
import { SlidersHorizontal, ZoomIn } from 'lucide-react';

interface Props {
  preset: EditorPreset;
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  activePop: string | null;
  onActivePopChange: (n: string | null) => void;
}

export function StudioQuickBar({ preset, setPreset, activePop, onActivePopChange }: Props) {
  const {
    studioPreset,
    setFrameFamily,
    setViewMode,
    setBackgroundId,
    setFrameStyle,
    setStudioParam
  } = useStudioState(preset, setPreset);

  const toggle = (n: string) => onActivePopChange(activePop === n ? null : n);

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
          <div className="xs-pop" style={{ minWidth: '240px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <StudioSlider
                label="Corner Radius"
                min={0}
                max={0.24}
                step={0.01}
                value={studioPreset.corner_radius}
                onChange={(v) => setStudioParam('corner_radius', v)}
              />
              <div className="xs-pop-divider" />
              <StudioSlider
                label="Frame Depth"
                min={0.02}
                max={0.12}
                step={0.005}
                value={studioPreset.depth}
                onChange={(v) => setStudioParam('depth', v)}
              />
              <div className="xs-pop-divider" />
              <StudioSlider
                label="Bevel"
                min={0}
                max={0.03}
                step={0.001}
                value={studioPreset.bevel}
                onChange={(v) => setStudioParam('bevel', v)}
              />
              <div className="xs-pop-divider" />
              <StudioSlider
                label="Frame Scale"
                min={0.7}
                max={1.35}
                step={0.05}
                value={studioPreset.frame_scale}
                onChange={(v) => setStudioParam('frame_scale', v)}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
        <Tooltip text="Zoom" position="top">
          <button
            className={`xs-btn xs-icon-btn ${activePop === 'studio-zoom' ? 'active' : ''}`}
            onClick={() => toggle('studio-zoom')}
            aria-label="Zoom"
            title="Zoom"
          >
            <ZoomIn size={14} strokeWidth={2} />
          </button>
        </Tooltip>
        {activePop === 'studio-zoom' && (
          <div className="xs-pop" style={{ minWidth: '240px' }}>
            <StudioSlider
              label="Content Zoom"
              min={0.75}
              max={1.5}
              step={0.05}
              value={studioPreset.content_scale}
              onChange={(v) => setStudioParam('content_scale', v)}
            />
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
          <div className="xs-pop" style={{ minWidth: '240px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <StudioSlider
                label="Shadow Intensity"
                min={0}
                max={1}
                step={0.05}
                value={studioPreset.shadow_intensity}
                onChange={(v) => setStudioParam('shadow_intensity', v)}
              />
              <div className="xs-pop-divider" />
              <StudioSlider
                label="Shadow Angle"
                min={-180}
                max={180}
                step={1}
                unit="°"
                value={studioPreset.shadow_angle}
                onChange={(v) => setStudioParam('shadow_angle', v)}
              />
              <div className="xs-pop-divider" />
              <StudioSlider
                label="Shadow Blur"
                min={0}
                max={96}
                step={2}
                value={studioPreset.shadow_blur}
                onChange={(v) => setStudioParam('shadow_blur', v)}
              />
              <div className="xs-pop-divider" />
              <StudioSlider
                label="Shadow Opacity"
                min={0}
                max={0.85}
                step={0.05}
                value={studioPreset.shadow_opacity}
                onChange={(v) => setStudioParam('shadow_opacity', v)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="xs-divider" />
      <ViewModePill value={studioPreset.view_mode} onChange={setViewMode} />
    </>
  );
}
