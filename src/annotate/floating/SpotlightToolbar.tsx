import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, Focus, MoonStar } from 'lucide-react';
import { useAnnotationStore } from '../state/store';
import { SpotlightObject } from '../state/types';
import { RadiusIcon } from './ToolbarIcons';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: SpotlightObject;
}

export function SpotlightToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showOpacity, setShowOpacity] = useState(false);
  const [showRadius, setShowRadius] = useState(false);

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
        pointerEvents: 'auto',
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

          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showOpacity ? 'active' : ''}`}
              onClick={() => {
                setShowOpacity(!showOpacity);
                setShowRadius(false);
              }}
              title="Spotlight Dim"
            >
              <MoonStar size={14} />
            </button>
            {showOpacity && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MoonStar size={12} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>{Math.round(obj.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={Math.round(obj.opacity * 100)}
                  onChange={(e) => updateObject(obj.id, { opacity: parseInt(e.target.value, 10) / 100 })}
                  className="xs-toolbar-slider"
                />
              </div>
            )}
          </div>

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showRadius ? 'active' : ''}`}
              onClick={() => {
                setShowRadius(!showRadius);
                setShowOpacity(false);
              }}
              title="Spotlight Radius"
            >
              <RadiusIcon />
            </button>
            {showRadius && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Focus size={12} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>{obj.cornerRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="64"
                  value={obj.cornerRadius}
                  onChange={(e) => updateObject(obj.id, { cornerRadius: parseInt(e.target.value, 10) })}
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
