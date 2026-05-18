import type { ViewMode } from '../types';
import { Tooltip } from '../../editor/Tooltip';

const VIEWS: ViewMode[] = ['Left', 'Front', 'Right'];

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export function ViewModePill({ value, onChange }: Props) {
  return (
    <div className="studio-view-pill">
      {VIEWS.map(v => (
        <Tooltip key={v} text={`${v} view`}>
          <button
            className={`studio-view-pill__btn${value === v ? ' active' : ''}`}
            onClick={() => onChange(v)}
            aria-label={`${v} view`}
            aria-pressed={value === v}
          >
            {v}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
