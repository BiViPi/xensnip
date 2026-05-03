import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { BlurObject } from '../state/types';
import { ChevronRight, ChevronLeft, Ghost } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: BlurObject;
}

export function BlurToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showSlider, setShowSlider] = useState(false);

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
          
          <Ghost size={14} color="#64748b" />

          <div style={{ position: 'relative' }}>
            <button 
              className="xs-toolbar-text"
              style={{ minWidth: '40px' }}
              onClick={() => setShowSlider(!showSlider)}
            >
              Blur: {obj.blurRadius}
            </button>
            {showSlider && (
              <div className="xs-toolbar-slider-popover">
                <span style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Intensity</span>
                <input 
                  type="range" 
                  min="1" max="50" 
                  value={obj.blurRadius}
                  onChange={(e) => updateObject(obj.id, { blurRadius: parseInt(e.target.value) })}
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
