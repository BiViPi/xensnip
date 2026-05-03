import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { ArrowObject } from '../state/types';
import { ChevronRight, ChevronLeft, Type } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: ArrowObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

export function ArrowToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showSlider, setShowSlider] = useState(false);

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  // Center horizontally relative to object
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
              onClick={() => setShowSlider(!showSlider)}
            >
              {obj.strokeWidth}px
            </button>
            {showSlider && (
              <div className="xs-toolbar-slider-popover">
                <input
                  type="range"
                  min="2" max="20"
                  value={obj.strokeWidth}
                  onChange={(e) => updateObject(obj.id, { strokeWidth: parseInt(e.target.value) })}
                  className="xs-toolbar-slider"
                />
              </div>
            )}
          </div>

          <div className="xs-toolbar-divider" />

          <button
            className={`xs-toolbar-btn ${obj.style === 'dashed' ? 'active' : ''}`}
            onClick={() => updateObject(obj.id, { style: obj.style === 'dashed' ? 'solid' : 'dashed' })}
            title="Toggle Line Style"
          >
            <Type size={14} />
          </button>
        </div>
      )}
    </div>,
    overlay
  );
}
