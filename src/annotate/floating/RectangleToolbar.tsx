import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { RectangleObject } from '../state/types';
import { Trash2, Maximize } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: RectangleObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];
const FILL_COLORS = ['transparent', 'rgba(239, 68, 68, 0.2)', 'rgba(59, 130, 246, 0.2)', 'rgba(255, 255, 255, 0.2)', '#ef4444', '#3b82f6'];

export function RectangleToolbar({ anchor, obj }: Props) {
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
            className={`xs-color-chip ${obj.stroke === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => updateObject(obj.id, { stroke: c })}
          />
        ))}
        <div className="xs-toolbar-divider" />
        <button className="xs-toolbar-btn" onClick={() => removeObject(obj.id)}><Trash2 size={14} /></button>
      </div>
      <div className="xs-toolbar-row">
        <span className="xs-toolbar-text">Fill</span>
        {FILL_COLORS.map(c => (
          <button 
            key={c}
            className={`xs-color-chip ${obj.fill === c ? 'active' : ''}`}
            style={{ background: c === 'transparent' ? 'none' : c, border: c === 'transparent' ? '1px dashed #64748b' : 'none' }}
            onClick={() => updateObject(obj.id, { fill: c })}
          />
        ))}
      </div>
      <div className="xs-toolbar-row">
        <input 
          type="range" 
          min="0" max="24" 
          value={obj.cornerRadius}
          onChange={(e) => updateObject(obj.id, { cornerRadius: parseInt(e.target.value) })}
          className="xs-toolbar-slider"
        />
        <span className="xs-toolbar-text">{obj.cornerRadius}px</span>
        <div className="xs-toolbar-divider" />
        <Maximize size={12} color="#64748b" />
      </div>
    </div>,
    overlay
  );
}
