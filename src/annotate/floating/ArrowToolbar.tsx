import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { ArrowObject } from '../state/types';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { DashedLineIcon, PaletteIcon, SolidLineIcon } from './ToolbarIcons';
import { SliderToggle } from './SliderToggle';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: ArrowObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

export function ArrowToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showThickness, setShowThickness] = useState(false);
  const [showColors, setShowColors] = useState(false);

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

          <button
            className={`xs-toolbar-btn ${obj.style === 'solid' ? 'active' : ''}`}
            onClick={() => updateObject(obj.id, { style: 'solid' })}
            title="Solid"
          >
            <SolidLineIcon />
          </button>

          <button
            className={`xs-toolbar-btn ${obj.style === 'dashed' ? 'active' : ''}`}
            onClick={() => updateObject(obj.id, { style: 'dashed' })}
            title="Dashed"
          >
            <DashedLineIcon />
          </button>

          <div className="xs-toolbar-divider" />

          <SliderToggle
            value={obj.strokeWidth}
            onChange={(val) => updateObject(obj.id, { strokeWidth: val })}
            isOpen={showThickness}
            onToggle={(open) => {
              setShowThickness(open);
              if (open) setShowColors(false);
            }}
            title="Line Thickness"
          />

          <div className="xs-toolbar-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showColors ? 'active' : ''}`}
              onClick={() => {
                setShowColors(!showColors);
                setShowThickness(false);
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
        </div>
      )}
    </div>,
    overlay
  );
}
