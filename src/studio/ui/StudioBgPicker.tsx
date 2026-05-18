import { STUDIO_BACKGROUNDS } from '@studio-impl/backgrounds';
import { Tooltip } from '../../editor/Tooltip';

interface Props {
  value: string;
  onChange: (id: string) => void;
  activePop: string | null;
  onActivePopChange: (n: string | null) => void;
}

const POP_KEY = 'studio-bg';

export function StudioBgPicker({ value, onChange, activePop, onActivePopChange }: Props) {
  const isOpen = activePop === POP_KEY;
  const toggle = () => onActivePopChange(isOpen ? null : POP_KEY);
  const current = STUDIO_BACKGROUNDS.find(b => b.id === value);

  return (
    <div style={{ position: 'relative', display: 'flex' }}>
      <Tooltip text="Studio background">
        <button
          className={`xs-btn xs-icon-btn${isOpen ? ' active' : ''}`}
          onClick={toggle}
          aria-label="Studio background"
          aria-expanded={isOpen}
        >
          <span
            className="studio-bg-dot"
            style={{ background: current?.tone === 'light' ? '#d4d4d4' : '#1a1a2e' }}
          />
        </button>
      </Tooltip>
      {isOpen && (
        <div className="xs-pop studio-bg-pop">
          {STUDIO_BACKGROUNDS.map(bg => (
            <button
              key={bg.id}
              className={`studio-bg-item${value === bg.id ? ' active' : ''}`}
              onClick={() => { onChange(bg.id); onActivePopChange(null); }}
              aria-label={bg.label}
              aria-pressed={value === bg.id}
            >
              <span
                className="studio-bg-item__swatch"
                style={{ background: bg.tone === 'light' ? '#d4d4d4' : '#1a1a2e' }}
              />
              <span className="studio-bg-item__label">{bg.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
