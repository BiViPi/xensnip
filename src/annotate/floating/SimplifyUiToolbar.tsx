import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, SlidersHorizontal, Contrast } from 'lucide-react';
import { useAnnotationStore } from '../state/store';
import { SimplifyUiObject } from '../state/types';
import { SliderToggle } from './SliderToggle';
import { RadiusToggle } from './RadiusToggle';
import { ToolbarActions } from './ToolbarActions';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: SimplifyUiObject;
}

export function SimplifyUiToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showDetail, setShowDetail] = useState(false);
  const [showContrast, setShowContrast] = useState(false);
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

          <SliderToggle
            value={Math.round(obj.detailLevel ?? 50)}
            onChange={(val) => updateObject(obj.id, { detailLevel: val })}
            min={0}
            max={100}
            step={5}
            unit=""
            isOpen={showDetail}
            onToggle={(open) => {
              setShowDetail(open);
              if (open) {
                setShowContrast(false);
                setShowRadius(false);
              }
            }}
            icon={<SlidersHorizontal size={14} />}
            title="Simplify UI Detail"
          />

          <div className="xs-toolbar-divider" />

          <SliderToggle
            value={Math.round((obj.blockOpacity ?? obj.dimOpacity) * 100)}
            onChange={(val) =>
              updateObject(obj.id, {
                blockOpacity: val / 100,
                dimOpacity: val / 100,
              })
            }
            min={15}
            max={90}
            unit="%"
            isOpen={showContrast}
            onToggle={(open) => {
              setShowContrast(open);
              if (open) {
                setShowDetail(false);
                setShowRadius(false);
              }
            }}
            icon={<Contrast size={14} />}
            title="Simplify UI Contrast"
          />

          <div className="xs-toolbar-divider" />

          <RadiusToggle
            value={obj.cornerRadius}
            onChange={(val) => updateObject(obj.id, { cornerRadius: val })}
            min={0}
            max={64}
            isOpen={showRadius}
            onToggle={(open) => {
              setShowRadius(open);
              if (open) {
                setShowDetail(false);
                setShowContrast(false);
              }
            }}
          />

          <ToolbarActions obj={obj} />
        </div>
      )}
    </div>,
    overlay
  );
}
