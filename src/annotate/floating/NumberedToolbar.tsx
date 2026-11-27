import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { NumberedObject } from '../state/types';
import { ChevronRight, ChevronLeft, CircleDot, ListOrdered } from 'lucide-react';
import { PaletteIcon } from './ToolbarIcons';
import { Tooltip } from '../../editor/Tooltip';
import { SliderToggle } from './SliderToggle';
import { ToolbarActions } from './ToolbarActions';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: NumberedObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

export function NumberedToolbar({ anchor, obj }: Props) {
  const { updateObject, patchToolDefaults, renumberSteps, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showColors, setShowColors] = useState(false);
  const [showSize, setShowSize] = useState(false);

  const applyNumberedStyle = (patch: Partial<Pick<NumberedObject, 'fill' | 'radius'>>) => {
    updateObject(obj.id, patch);
    patchToolDefaults('numbered', patch);
  };

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
      <Tooltip text={toolbarCollapsed ? "Expand Toolbar" : "Collapse Toolbar"} position="top">
        <button
          className="xs-toolbar-btn xs-toolbar-toggle"
          onClick={() => setToolbarCollapsed(!toolbarCollapsed)}
        >
          {toolbarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </Tooltip>

      {!toolbarCollapsed && (
        <div className="xs-toolbar-section">
          <div className="xs-toolbar-divider" />
          <div style={{ position: 'relative' }}>
            <Tooltip text="Marker Color" position="top">
              <button
                className={`xs-toolbar-btn ${showColors ? 'active' : ''}`}
                aria-label="Marker Color"
                onClick={() => {
                  setShowColors(!showColors);
                  setShowSize(false);
                }}
              >
                <PaletteIcon />
              </button>
            </Tooltip>
            {showColors && (
              <div className="xs-toolbar-slider-popover xs-color-popover">
                {COLORS.map(c => (
                  <Tooltip key={c} text={c} position="top">
                    <button
                      key={c}
                      className={`xs-color-chip ${obj.fill === c ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => applyNumberedStyle({ fill: c })}
                    />
                  </Tooltip>
                ))}
              </div>
            )}
          </div>

          <div className="xs-toolbar-divider" />

          <SliderToggle
            value={obj.radius}
            onChange={(radius) => applyNumberedStyle({ radius })}
            min={8}
            max={48}
            step={1}
            isOpen={showSize}
            onToggle={(open) => {
              setShowSize(open);
              if (open) setShowColors(false);
            }}
            icon={<CircleDot size={14} />}
            title="Badge Size"
          />

          <div className="xs-toolbar-divider" />

          <Tooltip text="Renumber 1..N" position="top">
            <button
              className="xs-toolbar-btn"
              aria-label="Renumber 1..N"
              onClick={renumberSteps}
            >
              <ListOrdered size={14} />
            </button>
          </Tooltip>

          <ToolbarActions obj={obj} />
        </div>
      )}
    </div>,
    overlay
  );
}
