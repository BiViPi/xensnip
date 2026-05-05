import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, MoonStar } from 'lucide-react';
import { useAnnotationStore } from '../state/store';
import { SimplifyUiObject } from '../state/types';
import { RadiusIcon } from './ToolbarIcons';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: SimplifyUiObject;
}

export function SimplifyUiToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showDim, setShowDim] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const [showSaturation, setShowSaturation] = useState(false);
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
              className={`xs-toolbar-btn ${showDim ? 'active' : ''}`}
              onClick={() => {
                setShowDim(!showDim);
                setShowBlur(false);
                setShowSaturation(false);
                setShowRadius(false);
              }}
              title="Spotlight Dim"
            >
              <MoonStar size={14} />
            </button>
            {showDim && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MoonStar size={12} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>{Math.round(obj.dimOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(obj.dimOpacity * 100)}
                  onChange={(e) => updateObject(obj.id, { dimOpacity: parseInt(e.target.value, 10) / 100 })}
                  className="xs-toolbar-slider"
                />
              </div>
            )}
          </div>

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showBlur ? 'active' : ''}`}
              onClick={() => {
                setShowBlur(!showBlur);
                setShowDim(false);
                setShowSaturation(false);
                setShowRadius(false);
              }}
              title="Spotlight Soften"
            >
              <MoonStar size={14} />
            </button>
            {showBlur && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MoonStar size={12} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>{obj.blurRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  value={obj.blurRadius}
                  onChange={(e) => updateObject(obj.id, { blurRadius: parseInt(e.target.value, 10) })}
                  className="xs-toolbar-slider"
                />
              </div>
            )}
          </div>

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showSaturation ? 'active' : ''}`}
              onClick={() => {
                setShowSaturation(!showSaturation);
                setShowDim(false);
                setShowBlur(false);
                setShowRadius(false);
              }}
              title="Spotlight Desaturate"
            >
              <MoonStar size={14} />
            </button>
            {showSaturation && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MoonStar size={12} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>{Math.round(obj.saturation * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(obj.saturation * 100)}
                  onChange={(e) => updateObject(obj.id, { saturation: parseInt(e.target.value, 10) / 100 })}
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
                setShowDim(false);
                setShowBlur(false);
                setShowSaturation(false);
              }}
              title="Spotlight Radius"
            >
              <RadiusIcon />
            </button>
            {showRadius && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <RadiusIcon />
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
