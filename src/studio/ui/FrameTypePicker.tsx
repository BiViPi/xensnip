import { AppWindow, Layers } from 'lucide-react';
import type { FrameFamily } from '../types';
import { Tooltip } from '../../editor/Tooltip';

const OPTIONS: { value: FrameFamily; label: string; icon: React.ReactNode }[] = [
  { value: 'browser', label: 'Browser frame', icon: <AppWindow size={14} /> },
  { value: 'acrylic', label: 'Acrylic frame', icon: <Layers size={14} /> },
];

interface Props {
  value: FrameFamily;
  onChange: (f: FrameFamily) => void;
}

export function FrameTypePicker({ value, onChange }: Props) {
  return (
    <div className="studio-seg">
      {OPTIONS.map(o => (
        <Tooltip key={o.value} text={o.label}>
          <button
            className={`studio-seg__btn${value === o.value ? ' active' : ''}`}
            onClick={() => onChange(o.value)}
            aria-label={o.label}
            aria-pressed={value === o.value}
          >
            {o.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
