import { Box } from 'lucide-react';
import { Tooltip } from '../../editor/Tooltip';

interface Props {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function QuickBarModeToggle({ active, disabled = false, onToggle }: Props) {
  return (
    <Tooltip text={disabled ? 'Studio unavailable' : (active ? '2D' : 'Studio')} position="top">
      <button
        className={`xs-btn xs-icon-btn${active ? ' active' : ''}`}
        onClick={onToggle}
        disabled={disabled}
        aria-label={active ? '2D' : 'Studio'}
        aria-pressed={active}
      >
        <Box size={18} strokeWidth={2} />
      </button>
    </Tooltip>
  );
}
