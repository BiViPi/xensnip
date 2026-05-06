import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { FreehandArrowObject } from '../state/types';
import { ColorToggle } from './ColorToggle';
import { SliderToggle } from './SliderToggle';
import { MousePointer2, Waves, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: FreehandArrowObject;
}

export function FreehandArrowToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const toggle = (id: string) => (open: boolean) => {
    setActivePopover(open ? id : null);
  };
  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const left = anchor.left + anchor.width / 2;
  const top = anchor.top - 40;

  const smoothingLevels = [
    { label: 'Raw', value: 0 },
    { label: 'Low', value: 0.2 },
    { label: 'Mid', value: 0.5 },
    { label: 'High', value: 0.8 },
  ] as const;

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
          <ColorToggle
            color={obj.stroke}
            onChange={(stroke: string) => updateObject(obj.id, { stroke })}
            title="Stroke Color"
            isOpen={activePopover === 'color'}
            onToggle={toggle('color')}
          />
          <div className="xs-toolbar-divider" />
          <SliderToggle
            value={obj.strokeWidth}
            onChange={(strokeWidth: number) => updateObject(obj.id, { strokeWidth })}
            isOpen={activePopover === 'width'}
            onToggle={toggle('width')}
            title="Line Thickness"
          />
        </div>
      )}

      {!toolbarCollapsed && (
        <>
          <div className="xs-toolbar-divider" />

          <div className="xs-toolbar-section">
            <div className="xs-toolbar-select-wrapper" title="Smoothing">
              <Waves size={14} className="xs-select-icon" />
              <select
                value={obj.smoothing}
                onChange={(e) => updateObject(obj.id, { smoothing: parseFloat(e.target.value) })}
                className="xs-toolbar-select"
              >
                {smoothingLevels.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="xs-toolbar-divider" />

          <div className="xs-toolbar-section">
            <button
              className="xs-toolbar-btn"
              onClick={() => updateObject(obj.id, { pointerLength: obj.pointerLength === 0 ? 12 : 0 })}
              title="Toggle Arrowhead"
            >
              <MousePointer2 size={14} style={{ opacity: obj.pointerLength > 0 ? 1 : 0.4 }} />
            </button>
          </div>
        </>
      )}
    </div>,
    overlay
  );
}
