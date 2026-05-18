import type { CSSProperties } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function StudioSlider({ label, value, min, max, step, unit = '', onChange }: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  const ratio = pct / 100;
  const fillWidth = `calc(${pct}% + ${(9 - 18 * ratio).toFixed(2)}px)`;
  const displayValue = Number.isInteger(value) ? value.toString() : value.toFixed(3).replace(/\.?0+$/, '');

  const handleStep = (delta: number) => {
    const next = Math.min(max, Math.max(min, Number((value + delta).toFixed(3))));
    onChange(next);
  };

  return (
    <div className="xs-slider-pop">
      <div className="xs-slider-header">
        <span className="xs-slider-label">{label}</span>
        <div className="xs-slider-value-badge">
          <span className="xs-slider-value">{displayValue}</span>
          {unit && <span className="xs-slider-unit">{unit}</span>}
        </div>
      </div>

      <div className="xs-slider-row">
        <button className="xs-slider-action" onClick={() => handleStep(-step)} aria-label={`Decrease ${label}`}>-</button>
        <div
          className="xs-slider-track-container"
          style={
            {
              "--pct": `${pct}%`,
              "--fill-width": fillWidth,
            } as CSSProperties
          }
        >
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
        <button className="xs-slider-action" onClick={() => handleStep(step)} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
