interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function SliderControl({ label, value, min, max, onChange }: Props) {
  const pct = ((value - min) / (max - min)) * 100;

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(next);
  };

  const ticks = [min, min + (max - min) / 4, min + (max - min) / 2, min + (max - min) * 3 / 4, max];

  return (
    <div className="control-popover slider-popover">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <div className="slider-value-row">
          <span className="slider-value">{value}</span>
          <span className="slider-unit">px</span>
        </div>
      </div>

      <div className="slider-track-row">
        <button className="slider-icon-btn" onClick={() => step(-4)} title="Decrease">−</button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="control-slider"
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />
        <button className="slider-icon-btn" onClick={() => step(4)} title="Increase">+</button>
      </div>

      <div className="slider-ticks">
        {ticks.map((t, i) => (
          <span key={i} className="slider-tick">{Math.round(t)}</span>
        ))}
      </div>
    </div>
  );
}
