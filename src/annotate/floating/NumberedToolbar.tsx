import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { NumberedObject } from '../state/types';
import { ChevronRight, ChevronLeft, Hash } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: NumberedObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

export function NumberedToolbar({ anchor, obj }: Props) {
  const { updateObject } = useAnnotationStore();
  const [collapsed, setCollapsed] = useState(false);
  const [showSlider, setShowSlider] = useState(false);

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const left = anchor.left + anchor.width / 2;
  const top = anchor.top - 40;

  return createPortal(
    <div 
      className={`xs-floating-toolbar ${collapsed ? 'collapsed' : ''}`}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto'
      }}
    >
      <button 
        className="xs-toolbar-btn xs-toolbar-toggle"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!collapsed && (
        <div className="xs-toolbar-section">
          <div className="xs-toolbar-divider" />
          
          {COLORS.map(c => (
            <button 
              key={c}
              className={`xs-color-chip ${obj.fill === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => updateObject(obj.id, { fill: c })}
            />
          ))}

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button 
              className="xs-toolbar-text"
              style={{ minWidth: '40px' }}
              onClick={() => setShowSlider(!showSlider)}
            >
              #{obj.displayNumber} · {obj.radius}px
            </button>
            {showSlider && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Hash size={10} color="#64748b" />
                  <span style={{ fontSize: 10, color: '#64748b' }}>Size</span>
                </div>
                <input 
                  type="range" 
                  min="8" max="40" 
                  value={obj.radius}
                  onChange={(e) => updateObject(obj.id, { radius: parseInt(e.target.value) })}
                  className="xs-toolbar-slider"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    overlay
  );
}
