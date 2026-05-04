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


  return (
    <div className="xs-slider-pop">
      <div className="xs-slider-header">
        <span className="xs-slider-label">{label}</span>
        <div className="xs-slider-value-badge">
          <span className="xs-slider-value">{value}</span>
          <span className="xs-slider-unit">px</span>
        </div>
      </div>

      <div className="xs-slider-row">
        <button className="xs-slider-action" onClick={() => step(-4)}>−</button>
        <div className="xs-slider-track-container">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="xs-slider-input"
            style={{ "--pct": `${pct}%` } as React.CSSProperties}
          />
        </div>
        <button className="xs-slider-action" onClick={() => step(4)}>+</button>
      </div>

    </div>
  );
}
