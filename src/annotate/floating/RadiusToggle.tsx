import { RadiusIcon } from './ToolbarIcons';

interface Props {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function RadiusToggle({ value, onChange, min = 0, max = 24, isOpen, onToggle }: Props) {

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`xs-toolbar-btn ${isOpen ? 'active' : ''}`}
        onClick={() => onToggle(!isOpen)}
        title="Corner Radius"
      >
        <RadiusIcon />
      </button>
      {isOpen && (
        <div className="xs-toolbar-slider-popover">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <RadiusIcon />
            <span style={{ fontSize: 10, color: '#64748b' }}>{value}px</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="xs-toolbar-slider"
          />
        </div>
      )}
    </div>
  );
}
