import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { ArrowObject } from '../state/types';
import { Trash2, Type } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: ArrowObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

export function ArrowToolbar({ anchor, obj }: Props) {
  const { updateObject, removeObject } = useAnnotationStore();

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  // Position: 12px above the object
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
            className={`xs-color-chip ${obj.stroke === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => updateObject(obj.id, { stroke: c })}
          />
        ))}
        <div className="xs-toolbar-divider" />
        <button 
          className="xs-toolbar-btn"
          onClick={() => removeObject(obj.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="xs-toolbar-row">
        <input 
          type="range" 
          min="2" max="20" 
          value={obj.strokeWidth}
          onChange={(e) => updateObject(obj.id, { strokeWidth: parseInt(e.target.value) })}
          className="xs-toolbar-slider"
        />
        <span className="xs-toolbar-text">{obj.strokeWidth}px</span>
        <div className="xs-toolbar-divider" />
        <button 
          className={`xs-toolbar-btn ${obj.style === 'dashed' ? 'active' : ''}`}
          onClick={() => updateObject(obj.id, { style: obj.style === 'dashed' ? 'solid' : 'dashed' })}
        >
          <Type size={14} />
        </button>
      </div>
    </div>,
    overlay
  );
}
