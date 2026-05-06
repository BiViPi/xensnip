import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { OpaqueRedactObject } from '../state/types';
import { ChevronRight, ChevronLeft, Copy, Trash2 } from 'lucide-react';
import { PaletteIcon } from './ToolbarIcons';
import { SliderToggle } from './SliderToggle';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: OpaqueRedactObject;
}

const COLORS = ['#000000', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b'];

export function OpaqueRedactToolbar({ anchor, obj }: Props) {
  const { updateObject, removeObject, addObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showFillColors, setShowFillColors] = useState(false);
  const [showBorderColors, setShowBorderColors] = useState(false);
  const [showThickness, setShowThickness] = useState(false);

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const left = anchor.left + anchor.width / 2;
  const top = anchor.top - 40;

  const handleDuplicate = () => {
    const newId = `obj-${Date.now()}`;
    addObject({
      ...obj,
      id: newId,
      x: obj.x + 10,
      y: obj.y + 10,
    });
  };

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

          {/* Fill Color */}
          <div style={{ position: 'relative' }}>
            <button
              className={`xs-toolbar-btn ${showFillColors ? 'active' : ''}`}
              onClick={() => {
                setShowFillColors(!showFillColors);
                setShowBorderColors(false);
                setShowThickness(false);
              }}
              title="Fill Color"
            >
              <div style={{ width: 14, height: 14, background: obj.fill, borderRadius: 2, border: '1px solid rgba(255,255,255,0.2)' }} />
            </button>
            {showFillColors && (
              <div className="xs-toolbar-slider-popover xs-color-popover">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`xs-color-chip ${obj.fill === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => updateObject(obj.id, { fill: c })}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="xs-toolbar-divider" />

          {/* Border Thickness */}
          <SliderToggle
            value={obj.borderWidth}
            onChange={(val) => updateObject(obj.id, { borderWidth: val })}
            isOpen={showThickness}
            onToggle={(open) => {
              setShowThickness(open);
              if (open) {
                setShowFillColors(false);
                setShowBorderColors(false);
              }
            }}
            title="Border Thickness"
          />

          {obj.borderWidth > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className={`xs-toolbar-btn ${showBorderColors ? 'active' : ''}`}
                onClick={() => {
                  setShowBorderColors(!showBorderColors);
                  setShowFillColors(false);
                  setShowThickness(false);
                }}
                title="Border Color"
              >
                <PaletteIcon />
              </button>
              {showBorderColors && (
                <div className="xs-toolbar-slider-popover xs-color-popover">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`xs-color-chip ${obj.borderColor === c ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => updateObject(obj.id, { borderColor: c })}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="xs-toolbar-divider" />

          <button className="xs-toolbar-btn" onClick={handleDuplicate} title="Duplicate">
            <Copy size={14} />
          </button>
          
          <button className="xs-toolbar-btn" onClick={() => removeObject(obj.id)} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>,
    overlay
  );
}
