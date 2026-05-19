import { AppWindow, Layers } from 'lucide-react';
import type { FrameFamily, FrameStyle } from '../types';
import { Tooltip } from '../../editor/Tooltip';

const STYLES: { value: FrameStyle; label: string; bg: string; outline: string }[] = [
  { value: 'gloss-black', label: 'Gloss Black', bg: '#1c1c1e', outline: '#333' },
  { value: 'matte-black', label: 'Matte Black', bg: '#28282b', outline: '#444' },
  {
    value: 'gloss-white',
    label: 'Gloss White',
    bg: 'linear-gradient(180deg, #ffffff 0%, #f3f6fb 44%, #dde5f0 100%)',
    outline: '#cbd5e1',
  },
  { value: 'matte-white', label: 'Matte White', bg: '#f3f4f6', outline: '#cbd5e1' },
];

interface Props {
  value: FrameFamily;
  onChange: (f: FrameFamily) => void;
  activePop: string | null;
  onActivePopChange: (pop: string | null) => void;
  frameStyle: FrameStyle;
  onFrameStyleChange: (s: FrameStyle) => void;
}

export function FrameTypePicker({
  value,
  onChange,
  activePop,
  onActivePopChange,
  frameStyle,
  onFrameStyleChange,
}: Props) {
  const handleBrowserClick = () => {
    if (value === 'browser') {
      onActivePopChange(activePop === 'studio-browser-style' ? null : 'studio-browser-style');
    } else {
      onChange('browser');
      onActivePopChange('studio-browser-style');
    }
  };

  const handleAcrylicClick = () => {
    onChange('acrylic');
    onActivePopChange(null);
  };

  return (
    <div className="studio-seg" style={{ display: 'flex', alignItems: 'center' }}>
      {/* Browser Button Wrapper with absolute positioning for centered popover */}
      <div style={{ position: 'relative', display: 'flex' }}>
        <Tooltip text="Browser Frame" position="top">
          <button
            className={`studio-seg__btn${value === 'browser' ? ' active' : ''}`}
            onClick={handleBrowserClick}
            aria-label="Browser Frame"
            aria-pressed={value === 'browser'}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          >
            <AppWindow size={14} />
          </button>
        </Tooltip>

        {activePop === 'studio-browser-style' && (
          <div
            className="xs-pop"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 12px)',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '4px',
              minWidth: '150px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              zIndex: 100,
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div className="studio-bg-pop__header" style={{ margin: '4px 8px 2px', fontSize: '10px' }}>
              Browser Style
            </div>
            {STYLES.map(style => (
              <button
                key={style.value}
                className={`studio-style-option ${frameStyle === style.value ? 'active' : ''}`}
                onClick={() => {
                  onFrameStyleChange(style.value);
                  onChange('browser');
                  onActivePopChange(null);
                }}
              >
                <div
                  className={`xs-color-swatch studio-style-swatch${style.value.includes('white') ? ' studio-style-swatch--light' : ''}`}
                  style={{
                    background: style.bg,
                    borderColor: frameStyle === style.value ? 'var(--xs-accent, #6366f1)' : style.outline,
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
                <span className="studio-style-option__label">{style.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Segment Divider */}
      <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border, rgba(255 255 255 / 0.1))' }} />

      {/* Acrylic Button Wrapper */}
      <Tooltip text="Acrylic Frame" position="top">
        <button
          className={`studio-seg__btn${value === 'acrylic' ? ' active' : ''}`}
          onClick={handleAcrylicClick}
          aria-label="Acrylic Frame"
          aria-pressed={value === 'acrylic'}
          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        >
          <Layers size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
