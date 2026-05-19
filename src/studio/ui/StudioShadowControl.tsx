import type { StudioPreset } from '../types';
import { ShadowPanelIcon, OpacityIcon, AngleIcon, BlurIcon } from '../../components/icons';

interface Props {
  studioPreset: StudioPreset;
  onChange: <K extends keyof StudioPreset>(key: K, value: StudioPreset[K]) => void;
}

export function StudioShadowControl({ studioPreset, onChange }: Props) {
  const isEnabled = studioPreset.shadow_enabled;

  const items = [
    {
      id: 'opacity' as const,
      param: 'shadow_opacity' as const,
      label: 'Opacity',
      value: studioPreset.shadow_opacity,
      min: 0,
      max: 1,
      step: 0.01,
      unit: '%',
      displayVal: Math.round(studioPreset.shadow_opacity * 100),
      Icon: OpacityIcon,
    },
    {
      id: 'angle' as const,
      param: 'shadow_angle' as const,
      label: 'Angle',
      value: studioPreset.shadow_angle,
      min: -180,
      max: 180,
      step: 1,
      unit: '°',
      displayVal: studioPreset.shadow_angle,
      Icon: AngleIcon,
    },
    {
      id: 'blur' as const,
      param: 'shadow_blur' as const,
      label: 'Blur',
      value: studioPreset.shadow_blur,
      min: 0,
      max: 96,
      step: 1,
      unit: 'px',
      displayVal: studioPreset.shadow_blur,
      Icon: BlurIcon,
    },
  ];

  return (
    <div className="shadow-control-panel" style={{ width: '260px', padding: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--xs-text-dim)' }}>
          <ShadowPanelIcon />
          <span style={{ fontSize: '15px', fontWeight: 700 }}>Shadow</span>
        </div>
        <label className="xs-switch">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={() => onChange('shadow_enabled', !isEnabled)}
          />
          <span className="xs-slider"></span>
        </label>
      </div>

      <div
        style={{
          opacity: isEnabled ? 1 : 0.4,
          pointerEvents: isEnabled ? 'auto' : 'none',
          transition: 'opacity 0.2s',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {items.map(item => {
          const pct = ((item.value - item.min) / (item.max - item.min)) * 100;
          const ratio = pct / 100;
          const fillWidth = `calc(${pct}% + ${(9 - 18 * ratio).toFixed(2)}px)`;

          return (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 60px 1fr 40px',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <item.Icon />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--xs-text-dim)', fontWeight: 600 }}>{item.label}</span>
              <div
                className="xs-slider-track-container"
                style={
                  {
                    flex: 1,
                    '--pct': `${pct}%`,
                    '--fill-width': fillWidth,
                  } as React.CSSProperties
                }
              >
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  className="xs-slider-input"
                  value={item.value}
                  onChange={e => onChange(item.param, parseFloat(e.target.value))}
                />
              </div>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--xs-accent)',
                  fontWeight: 700,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '40px',
                }}
              >
                {item.displayVal}
                {item.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
