import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { PixelRulerObject } from '../state/types';
import { ChevronRight, ChevronLeft, Square } from 'lucide-react';
import { PaletteIcon, StrokeWidthIcon } from './ToolbarIcons';
import { SliderToggle } from './SliderToggle';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: PixelRulerObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

export function PixelRulerToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showThickness, setShowThickness] = useState(false);
  const [showColors, setShowColors] = useState(false);

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

          {/* Color Picker */}
          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showColors ? 'active' : ''}`}
              onClick={() => {
                setShowColors(!showColors);
                setShowThickness(false);
              }}
              title="Ruler Color"
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

          <div className="xs-toolbar-divider" />

          {/* Thickness */}
          <SliderToggle
            value={obj.strokeWidth}
            onChange={(val) => updateObject(obj.id, { strokeWidth: val })}
            min={1}
            max={12}
            isOpen={showThickness}
            onToggle={(open) => {
              setShowThickness(open);
              if (open) setShowColors(false);
            }}
            icon={<StrokeWidthIcon />}
            title="Stroke Thickness"
          />

          <div className="xs-toolbar-divider" />

          {/* Label Background Toggle */}
          <button
            className={`xs-toolbar-btn ${obj.showBackground ? 'active' : ''}`}
            onClick={() => updateObject(obj.id, { showBackground: !obj.showBackground })}
            title="Toggle Label Background"
          >
            <Square size={16} fill={obj.showBackground ? 'currentColor' : 'none'} />
          </button>
        </div>
      )}
    </div>,
    overlay
  );
}
