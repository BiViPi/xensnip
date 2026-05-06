import React from 'react';
import { StrokeWidthIcon } from './ToolbarIcons';

interface Props {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  title?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function SliderToggle({ 
  value, 
  onChange, 
  min = 1, 
  max = 24, 
  step = 1,
  unit = 'px',
  title, 
  icon, 
  isOpen, 
  onToggle 
}: Props) {

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`xs-toolbar-btn ${isOpen ? 'active' : ''}`}
        onClick={() => onToggle(!isOpen)}
        title={title || "Adjustment"}
      >
        {icon || <StrokeWidthIcon />}
      </button>
      {isOpen && (
        <div className="xs-toolbar-slider-popover">
          <div className="xs-compact-slider-row">
            <div className="xs-slider-track-container" style={{ width: '80px', '--fill-width': `${((value - min) / (max - min)) * 100}%` } as any}>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="xs-slider-input"
              />
            </div>
            <span className="xs-slider-value-text">{value}{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}
