import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { NumberedObject } from '../state/types';
import { Trash2, Hash } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: NumberedObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

export function NumberedToolbar({ anchor, obj }: Props) {
  const { updateObject, removeObject } = useAnnotationStore();

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const left = anchor.left + anchor.width / 2;
  const top = anchor.top - 50;

  return createPortal(
    <div 
      className="xs-floating-toolbar"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto'
      }}
    >
      <div className="xs-toolbar-row">
        {COLORS.map(c => (
          <button 
            key={c}
            className={`xs-color-chip ${obj.fill === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => updateObject(obj.id, { fill: c })}
          />
        ))}
        <div className="xs-toolbar-divider" />
        <button className="xs-toolbar-btn" onClick={() => removeObject(obj.id)}><Trash2 size={14} /></button>
      </div>
      <div className="xs-toolbar-row">
        <Hash size={14} color="#64748b" />
        <span className="xs-toolbar-text">Step #{obj.displayNumber}</span>
        <div className="xs-toolbar-divider" />
        <input 
          type="range" 
          min="8" max="40" 
          value={obj.radius}
          onChange={(e) => updateObject(obj.id, { radius: parseInt(e.target.value) })}
          className="xs-toolbar-slider"
        />
        <span className="xs-toolbar-text">{obj.radius}px</span>
      </div>
    </div>,
    overlay
  );
}
