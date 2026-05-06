import { RadiusIcon } from './ToolbarIcons';
import { SliderToggle } from './SliderToggle';

interface Props {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function RadiusToggle({ value, onChange, min = 0, max = 24, isOpen, onToggle }: Props) {
  return (
    <SliderToggle
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      isOpen={isOpen}
      onToggle={onToggle}
      icon={<RadiusIcon />}
      title="Corner Radius"
    />
  );
}
