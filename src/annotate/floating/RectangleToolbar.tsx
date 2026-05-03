import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { RectangleObject } from '../state/types';
import { ChevronRight, ChevronLeft, PaintBucket, Maximize } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: RectangleObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];
const FILL_COLORS = ['transparent', 'rgba(239, 68, 68, 0.2)', 'rgba(59, 130, 246, 0.2)', 'rgba(255, 255, 255, 0.2)', '#ef4444', '#3b82f6'];

export function RectangleToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showSlider, setShowSlider] = useState(false);
  const [showFill, setShowFill] = useState(false);

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const left = anchor.left + anchor.width / 2;
  const top = anchor.top - 40;

  return createPortal(
    <div 
      className={`xs-floating-toolbar ${toolbarCollapsed ? 'collapsed' : ''}`}
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
        onClick={() => setToolbarCollapsed(!toolbarCollapsed)}
      >
        {toolbarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!toolbarCollapsed && (
        <div className="xs-toolbar-section">
          <div className="xs-toolbar-divider" />
          
          {COLORS.map(c => (
            <button 
              key={c}
              className={`xs-color-chip ${obj.stroke === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => updateObject(obj.id, { stroke: c })}
            />
          ))}

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button 
              className="xs-toolbar-text"
              onClick={() => { setShowSlider(!showSlider); setShowFill(false); }}
              title="Corner Radius"
            >
              {obj.cornerRadius}px
            </button>
            {showSlider && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Maximize size={10} color="#64748b" />
                  <span style={{ fontSize: 10, color: '#64748b' }}>Radius</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="24" 
                  value={obj.cornerRadius}
                  onChange={(e) => updateObject(obj.id, { cornerRadius: parseInt(e.target.value) })}
                  className="xs-toolbar-slider"
                />
              </div>
            )}
          </div>

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button 
              className={`xs-toolbar-btn ${obj.fill !== 'transparent' ? 'active' : ''}`}
              onClick={() => { setShowFill(!showFill); setShowSlider(false); }}
              title="Fill Color"
            >
              <PaintBucket size={14} />
            </button>
            {showFill && (
              <div className="xs-toolbar-slider-popover" style={{ flexDirection: 'row', gap: 6 }}>
                {FILL_COLORS.map(c => (
                  <button 
                    key={c}
                    className={`xs-color-chip ${obj.fill === c ? 'active' : ''}`}
                    style={{ background: c === 'transparent' ? 'none' : c, border: c === 'transparent' ? '1px dashed rgba(255,255,255,0.3)' : 'none' }}
                    onClick={() => updateObject(obj.id, { fill: c })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    overlay
  );
}
