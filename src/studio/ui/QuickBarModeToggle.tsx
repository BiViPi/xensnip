import { Box } from 'lucide-react';
import { Tooltip } from '../../editor/Tooltip';

interface Props {
  active: boolean;
  onToggle: () => void;
}

export function QuickBarModeToggle({ active, onToggle }: Props) {
  return (
    <Tooltip text={active ? '2D' : 'Studio'} position="top">
      <button
        className={`xs-btn xs-icon-btn${active ? ' active' : ''}`}
        onClick={onToggle}
        aria-label={active ? '2D' : 'Studio'}
        aria-pressed={active}
      >
        <Box size={18} strokeWidth={2} />
      </button>
    </Tooltip>
  );
}
