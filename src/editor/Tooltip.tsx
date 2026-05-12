import { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ text, children, position = 'bottom' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div 
      className="xs-tooltip-container"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`xs-tooltip position-${position}`} aria-hidden="true">
          {text}
        </div>
      )}
    </div>
  );
}
