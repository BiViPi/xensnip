import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, ZoomIn, SquareSquare } from 'lucide-react';
import { useAnnotationStore } from '../state/store';
import { MagnifyObject } from '../state/types';
import { RadiusIcon } from './ToolbarIcons';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: MagnifyObject;
}

export function MagnifyToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showZoom, setShowZoom] = useState(false);
  const [showRadius, setShowRadius] = useState(false);
  const [showBorder, setShowBorder] = useState(false);

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
              className={`xs-toolbar-btn ${showZoom ? 'active' : ''}`}
              onClick={() => {
                setShowZoom(!showZoom);
                setShowRadius(false);
                setShowBorder(false);
              }}
              title="Magnify Zoom"
            >
              <ZoomIn size={14} />
            </button>
            {showZoom && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ZoomIn size={12} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>{Math.round(obj.zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="400"
                  step="10"
                  value={Math.round(obj.zoom * 100)}
                  onChange={(e) => updateObject(obj.id, { zoom: parseInt(e.target.value, 10) / 100 })}
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
                setShowZoom(false);
                setShowBorder(false);
              }}
              title="Magnify Radius"
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

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showBorder ? 'active' : ''}`}
              onClick={() => {
                setShowBorder(!showBorder);
                setShowZoom(false);
                setShowRadius(false);
              }}
              title="Border Opacity"
            >
              <SquareSquare size={14} />
            </button>
            {showBorder && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <SquareSquare size={12} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>{Math.round(obj.borderOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(obj.borderOpacity * 100)}
                  onChange={(e) => updateObject(obj.id, { borderOpacity: parseInt(e.target.value, 10) / 100 })}
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
