import type { FrameStyle } from '../types';
import { Tooltip } from '../../editor/Tooltip';

const STYLES: { value: FrameStyle; label: string; bg: string; outline: string }[] = [
  { value: 'gloss-black', label: 'Gloss Black', bg: '#111111', outline: '#333' },
  { value: 'matte-black', label: 'Matte Black', bg: '#2a2a2a', outline: '#3a3a3a' },
  {
    value: 'gloss-white',
    label: 'Gloss White',
    bg: 'linear-gradient(180deg, #ffffff 0%, #f3f6fb 44%, #dde5f0 100%)',
    outline: '#94a3b8',
  },
  { value: 'matte-white', label: 'Matte White', bg: '#e8edf3', outline: '#94a3b8' },
];

interface Props {
  value: FrameStyle;
  onChange: (s: FrameStyle) => void;
}

export function FrameStylePicker({ value, onChange }: Props) {
  return (
    <div className="studio-style-row">
      {STYLES.map(s => (
        <Tooltip key={s.value} text={s.label}>
          <button
            className={`xs-color-swatch studio-style-swatch${value === s.value ? ' active' : ''}${s.value.includes('white') ? ' studio-style-swatch--light' : ''}`}
            style={{
              background: s.bg,
              borderColor: value === s.value ? 'var(--accent)' : s.outline,
            }}
            onClick={() => onChange(s.value)}
            aria-label={s.label}
            aria-pressed={value === s.value}
          />
        </Tooltip>
      ))}
    </div>
  );
}
