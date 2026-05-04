import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { RectangleObject } from '../state/types';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { CloudLineIcon, DashedLineIcon, PaletteIcon, RadiusIcon, SolidLineIcon, StrokeWidthIcon } from './ToolbarIcons';

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
