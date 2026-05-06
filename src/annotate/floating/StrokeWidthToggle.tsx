import { StrokeWidthIcon } from './ToolbarIcons';

interface Props {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  title?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function StrokeWidthToggle({ value, onChange, min = 1, max = 24, title, icon, isOpen, onToggle }: Props) {

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`xs-toolbar-btn ${isOpen ? 'active' : ''}`}
        onClick={() => onToggle(!isOpen)}
        title={title || "Line Thickness"}
      >
        {icon || <StrokeWidthIcon />}
      </button>
      {isOpen && (
        <div className="xs-toolbar-slider-popover">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {icon || <StrokeWidthIcon />}
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
