import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { RectangleObject } from '../state/types';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: RectangleObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];
const LINE_STYLES: Array<{ id: RectangleObject['lineStyle']; label: string }> = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'cloud', label: 'Cloud' },
];

function SolidLineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DashedLineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.5 2" />
    </svg>
  );
}

function CloudLineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 8C2.3 6.8 3.3 6.2 4.2 6.2C4.7 4.8 5.9 4 7.1 4C8.3 4 9.3 4.8 9.8 5.9C11.1 6 12 6.8 12 8C12 9.3 11 10 9.9 10H4.2C3 10 2 9.3 2 8Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StrokeWidthIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 4H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 10H12" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 2C4.2 2 2 4.1 2 6.7C2 9.3 4.1 11.4 6.7 11.4H7.7C8.3 11.4 8.8 10.9 8.8 10.3C8.8 9.9 8.6 9.5 8.3 9.3C8 9.1 7.9 8.8 7.9 8.5C7.9 7.9 8.4 7.5 9 7.5H9.6C11.5 7.5 13 6 13 4.2C13 3 12.5 2 11.6 1.4C10.5 0.6 8.9 2 7 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="4.8" cy="5.2" r="0.8" fill="currentColor" />
      <circle cx="6.9" cy="4.5" r="0.8" fill="currentColor" />
      <circle cx="9" cy="5.1" r="0.8" fill="currentColor" />
    </svg>
  );
}

function RadiusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 11V5.5C3 4.1 4.1 3 5.5 3H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 3H11V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RectangleToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showRadius, setShowRadius] = useState(false);
  const [showThickness, setShowThickness] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const lineStyle = obj.lineStyle ?? 'solid';

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

          {LINE_STYLES.map((style) => (
            <button
              key={style.id}
              className={`xs-toolbar-btn ${lineStyle === style.id ? 'active' : ''}`}
              onClick={() => updateObject(obj.id, { lineStyle: style.id })}
              title={style.label}
            >
              {style.id === 'solid' && <SolidLineIcon />}
              {style.id === 'dashed' && <DashedLineIcon />}
              {style.id === 'cloud' && <CloudLineIcon />}
            </button>
          ))}

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showThickness ? 'active' : ''}`}
              onClick={() => {
                setShowThickness(!showThickness);
                setShowRadius(false);
                setShowColors(false);
              }}
              title="Line Thickness"
            >
              <StrokeWidthIcon />
            </button>
            {showThickness && (
              <div className="xs-toolbar-slider-popover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <StrokeWidthIcon />
                  <span style={{ fontSize: 10, color: '#64748b' }}>{obj.strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={obj.strokeWidth}
                  onChange={(e) => updateObject(obj.id, { strokeWidth: parseInt(e.target.value) })}
                  className="xs-toolbar-slider"
                />
              </div>
            )}
          </div>

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showColors ? 'active' : ''}`}
              onClick={() => {
                setShowColors(!showColors);
                setShowThickness(false);
                setShowRadius(false);
              }}
              title="Stroke Color"
            >
              <PaletteIcon />
            </button>
            {showColors && (
              <div className="xs-toolbar-slider-popover xs-color-popover">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`xs-color-chip ${obj.stroke === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => updateObject(obj.id, { stroke: c })}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>

          {lineStyle !== 'cloud' && (
            <>
              <div className="xs-toolbar-divider" />

              <div style={{ position: 'relative' }}>
                <button
                  className={`xs-toolbar-btn ${showRadius ? 'active' : ''}`}
                  onClick={() => {
                    setShowRadius(!showRadius);
                    setShowThickness(false);
                    setShowColors(false);
                  }}
                  title="Corner Radius"
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
                      max="24"
                      value={obj.cornerRadius}
                      onChange={(e) => updateObject(obj.id, { cornerRadius: parseInt(e.target.value) })}
                      className="xs-toolbar-slider"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>,
    overlay
  );
}
