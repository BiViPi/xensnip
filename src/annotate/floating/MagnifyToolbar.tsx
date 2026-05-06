import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, ZoomIn, SquareSquare } from 'lucide-react';
import { useAnnotationStore } from '../state/store';
import { MagnifyObject } from '../state/types';
import { RadiusToggle } from './RadiusToggle';
import { SliderToggle } from './SliderToggle';

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

          <SliderToggle
            value={Math.round(obj.zoom * 100)}
            onChange={(val) => updateObject(obj.id, { zoom: val / 100 })}
            min={100}
            max={400}
            step={10}
            unit="%"
            isOpen={showZoom}
            onToggle={(open) => {
              setShowZoom(open);
              if (open) {
                setShowRadius(false);
                setShowBorder(false);
              }
            }}
            icon={<ZoomIn size={14} />}
            title="Magnify Zoom"
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
                setShowZoom(false);
                setShowBorder(false);
              }
            }}
          />

          <div className="xs-toolbar-divider" />

          <SliderToggle
            value={Math.round(obj.borderOpacity * 100)}
            onChange={(val) => updateObject(obj.id, { borderOpacity: val / 100 })}
            min={0}
            max={100}
            unit="%"
            isOpen={showBorder}
            onToggle={(open) => {
              setShowBorder(open);
              if (open) {
                setShowZoom(false);
                setShowRadius(false);
              }
            }}
            icon={<SquareSquare size={14} />}
            title="Border Opacity"
          />
        </div>
      )}
    </div>,
    overlay
  );
}
