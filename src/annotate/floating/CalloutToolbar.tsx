import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { CalloutObject } from '../state/types';
import { ColorToggle } from './ColorToggle';
import { RadiusToggle } from './RadiusToggle';
import { StrokeWidthToggle } from './StrokeWidthToggle';
import { Type, MousePointer2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: CalloutObject;
}

export function CalloutToolbar({ anchor, obj }: Props) {
  const { updateObject } = useAnnotationStore();
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const toggle = (id: string) => (open: boolean) => {
    setActivePopover(open ? id : null);
  };
  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const left = anchor.left + anchor.width / 2;
  const top = anchor.top - 40;

  return createPortal(
    <div
      className="xs-floating-toolbar"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="xs-toolbar-section">
        <ColorToggle
          color={obj.fill}
          onChange={(fill: string) => updateObject(obj.id, { fill })}
          title="Label Background"
          isOpen={activePopover === 'bg'}
          onToggle={toggle('bg')}
        />
        <div className="xs-toolbar-divider" />
        <ColorToggle
          color={obj.textColor}
          onChange={(textColor: string) => updateObject(obj.id, { textColor })}
          icon={<Type size={14} />}
          title="Text Color"
          isOpen={activePopover === 'text'}
          onToggle={toggle('text')}
        />
      </div>

      <div className="xs-toolbar-divider" />

      <div className="xs-toolbar-section">
        <ColorToggle
          color={obj.lineColor}
          onChange={(lineColor: string) => updateObject(obj.id, { lineColor })}
          icon={<MousePointer2 size={14} />}
          title="Leader Line Color"
          isOpen={activePopover === 'line'}
          onToggle={toggle('line')}
        />
        <div className="xs-toolbar-divider" />
        <StrokeWidthToggle
          value={obj.lineWidth}
          onChange={(lineWidth: number) => updateObject(obj.id, { lineWidth })}
          title="Line Width"
          isOpen={activePopover === 'width'}
          onToggle={toggle('width')}
        />
        <div className="xs-toolbar-divider" />
        <StrokeWidthToggle
          value={obj.fontSize}
          onChange={(fontSize: number) => updateObject(obj.id, { fontSize })}
          icon={<Type size={14} />}
          title="Font Size"
          min={8}
          max={72}
          isOpen={activePopover === 'size'}
          onToggle={toggle('size')}
        />
      </div>

      <div className="xs-toolbar-divider" />

      <div className="xs-toolbar-section">
        <RadiusToggle
          value={obj.cornerRadius}
          onChange={(cornerRadius: number) => updateObject(obj.id, { cornerRadius })}
          isOpen={activePopover === 'radius'}
          onToggle={toggle('radius')}
        />
      </div>
    </div>,
    overlay
  );
}
