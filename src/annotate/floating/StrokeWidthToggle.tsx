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
          <div className="xs-compact-slider-row">
            <div className="xs-slider-track-container" style={{ width: '80px', '--fill-width': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}>
              <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="xs-slider-input"
              />
            </div>
            <span className="xs-slider-value-text">{value}px</span>
          </div>
        </div>
      )}
    </div>
  );
}
