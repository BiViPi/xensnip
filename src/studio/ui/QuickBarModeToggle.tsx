import { Box } from 'lucide-react';
import { Tooltip } from '../../editor/Tooltip';

interface Props {
  active: boolean;
  onToggle: () => void;
}

export function QuickBarModeToggle({ active, onToggle }: Props) {
  return (
    <Tooltip text={active ? 'Switch to 2D mode' : 'Switch to 2.5D Studio'}>
      <button
        className={`xs-btn xs-icon-btn${active ? ' active' : ''}`}
        onClick={onToggle}
        aria-label={active ? 'Switch to 2D mode' : 'Switch to 2.5D Studio'}
        aria-pressed={active}
      >
        <Box size={16} />
      </button>
    </Tooltip>
  );
}
