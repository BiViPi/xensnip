interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function SliderControl({ label, value, min, max, onChange }: Props) {
  return (
    <div className="control-popover slider-popover">
      <div className="slider-header">
        <span>{label}</span>
        <span>{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="control-slider"
      />
    </div>
  );
}
