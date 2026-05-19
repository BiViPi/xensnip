import React from 'react';
import type { StudioPreset } from '../types';
import { SlidersHorizontal, ZoomIn, RotateCw, CornerUpRight, Box, Layers } from 'lucide-react';

interface Props {
  studioPreset: StudioPreset;
  onChange: <K extends keyof StudioPreset>(key: K, value: StudioPreset[K]) => void;
}

export function StudioGeometryControl({ studioPreset, onChange }: Props) {
  const items = [
    {
      id: 'radius' as const,
      param: 'corner_radius' as const,
      label: 'Radius',
      value: studioPreset.corner_radius,
      min: 0,
      max: 0.24,
      step: 0.01,
      unit: '',
      displayVal: studioPreset.corner_radius.toFixed(2),
      Icon: () => <CornerUpRight size={14} style={{ color: 'var(--xs-text-dim)' }} />,
    },
    {
      id: 'depth' as const,
      param: 'depth' as const,
      label: 'Depth',
      value: studioPreset.depth,
      min: 0.02,
      max: 0.24,
      step: 0.005,
      unit: '',
      displayVal: studioPreset.depth.toFixed(3),
      Icon: () => <Box size={14} style={{ color: 'var(--xs-text-dim)' }} />,
    },
    {
      id: 'bevel' as const,
      param: 'bevel' as const,
      label: 'Bevel',
      value: studioPreset.bevel,
      min: 0,
      max: 0.03,
      step: 0.001,
      unit: '',
      displayVal: studioPreset.bevel.toFixed(3),
      Icon: () => <Layers size={14} style={{ color: 'var(--xs-text-dim)' }} />,
    },
    {
      id: 'scale' as const,
      param: 'frame_scale' as const,
      label: 'Scale',
      value: studioPreset.frame_scale,
      min: 0.7,
      max: 2.2,
      step: 0.05,
      unit: 'x',
      displayVal: studioPreset.frame_scale.toFixed(2),
      Icon: () => <ZoomIn size={14} style={{ color: 'var(--xs-text-dim)' }} />,
    },
    {
      id: 'rotation' as const,
      param: 'frame_rotation' as const,
      label: 'Rotation',
      value: studioPreset.frame_rotation ?? 0,
      min: -180,
      max: 180,
      step: 1,
      unit: '°',
      displayVal: (studioPreset.frame_rotation ?? 0).toString(),
      Icon: () => <RotateCw size={14} style={{ color: 'var(--xs-text-dim)' }} />,
    },
  ];

  return (
    <div className="shadow-control-panel" style={{ width: '260px', padding: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', marginBottom: '24px', alignItems: 'center', gap: '10px' }}>
        <SlidersHorizontal size={16} style={{ color: 'var(--xs-text-dim)' }} />
        <span style={{ fontSize: '15px', fontWeight: 700 }}>Geometry</span>
      </div>

      <div
        style={{
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
