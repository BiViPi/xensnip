import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { SpeechBubbleObject } from '../state/types';
import { ColorToggle } from './ColorToggle';
import { RadiusToggle } from './RadiusToggle';
import { StrokeWidthToggle } from './StrokeWidthToggle';
import { Type, MessageSquare, ChevronDown } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: SpeechBubbleObject;
}

export function SpeechBubbleToolbar({ anchor, obj }: Props) {
  const { updateObject } = useAnnotationStore();
  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  // Center horizontally relative to object body
  const left = anchor.left + anchor.width / 2;
  const top = anchor.top - 40;

  const sides = [
    { id: 'top', label: 'Top' },
    { id: 'bottom', label: 'Bottom' },
    { id: 'left', label: 'Left' },
    { id: 'right', label: 'Right' },
  ] as const;

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
          title="Background Color"
        />
        <div className="xs-toolbar-divider" />
        <ColorToggle
          color={obj.textColor}
          onChange={(textColor: string) => updateObject(obj.id, { textColor })}
          icon={<Type size={14} />}
          title="Text Color"
        />
      </div>

      <div className="xs-toolbar-divider" />

      <div className="xs-toolbar-section">
        <StrokeWidthToggle
          value={obj.fontSize}
          onChange={(fontSize: number) => updateObject(obj.id, { fontSize })}
          icon={<Type size={14} />}
          title="Font Size"
          min={8}
          max={72}
        />
        <div className="xs-toolbar-divider" />
        <RadiusToggle
          value={obj.cornerRadius}
          onChange={(cornerRadius: number) => updateObject(obj.id, { cornerRadius })}
        />
      </div>

      <div className="xs-toolbar-divider" />

      <div className="xs-toolbar-section">
        <div className="xs-toolbar-select-wrapper" title="Tail Side">
          <MessageSquare size={14} className="xs-select-icon" />
          <select
            value={obj.tailSide}
            onChange={(e) => updateObject(obj.id, { tailSide: e.target.value as any })}
            className="xs-toolbar-select"
          >
            {sides.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="xs-select-chevron" />
        </div>
      </div>
    </div>,
    overlay
  );
}
