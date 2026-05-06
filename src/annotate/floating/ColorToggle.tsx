import { PaletteIcon } from './ToolbarIcons';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

interface Props {
  color: string;
  onChange: (color: string) => void;
  title?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function ColorToggle({ color, onChange, title, icon, isOpen, onToggle }: Props) {

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`xs-toolbar-btn ${isOpen ? 'active' : ''}`}
        onClick={() => onToggle(!isOpen)}
        title={title || "Select Color"}
      >
        {icon || <PaletteIcon />}
      </button>
      {isOpen && (
        <div className="xs-toolbar-slider-popover xs-color-popover">
          {COLORS.map(c => (
            <button
              key={c}
              className={`xs-color-chip ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => {
                onChange(c);
                onToggle(false);
              }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}
