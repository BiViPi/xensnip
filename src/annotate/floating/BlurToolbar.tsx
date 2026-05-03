import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { BlurObject } from '../state/types';
import { Trash2, Ghost } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: BlurObject;
}

export function BlurToolbar({ anchor, obj }: Props) {
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
        <Ghost size={14} color="#64748b" />
        <span className="xs-toolbar-text">Blur Intensity</span>
        <input 
          type="range" 
          min="1" max="50" 
          value={obj.blurRadius}
          onChange={(e) => updateObject(obj.id, { blurRadius: parseInt(e.target.value) })}
          className="xs-toolbar-slider"
        />
        <span className="xs-toolbar-text">{obj.blurRadius}</span>
        <div className="xs-toolbar-divider" />
        <button className="xs-toolbar-btn" onClick={() => removeObject(obj.id)}><Trash2 size={14} /></button>
      </div>
    </div>,
    overlay
  );
}
