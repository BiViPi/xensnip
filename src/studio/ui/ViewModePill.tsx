import { PanelLeft, PanelRight, Square } from 'lucide-react';
import type { ViewMode } from '../types';
import { Tooltip } from '../../editor/Tooltip';

const VIEWS: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  { value: 'Left', label: 'Left', icon: <PanelLeft size={14} strokeWidth={2} /> },
  { value: 'Front', label: 'Front', icon: <Square size={13} strokeWidth={2} /> },
  { value: 'Right', label: 'Right', icon: <PanelRight size={14} strokeWidth={2} /> },
];

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export function ViewModePill({ value, onChange }: Props) {
  return (
    <div className="studio-view-pill">
      {VIEWS.map(({ value: mode, label, icon }) => (
        <Tooltip key={mode} text={label} position="top">
          <button
            className={`studio-view-pill__btn${value === mode ? ' active' : ''}`}
            onClick={() => onChange(mode)}
            aria-label={label}
            aria-pressed={value === mode}
          >
            <span className="studio-view-pill__icon" aria-hidden="true">{icon}</span>
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
