import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, MoonStar, Focus } from 'lucide-react';
import { useAnnotationStore } from '../state/store';
import { SpotlightObject } from '../state/types';
import { SliderToggle } from './SliderToggle';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: SpotlightObject;
}

export function SpotlightToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showOpacity, setShowOpacity] = useState(false);
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
            value={Math.round(obj.opacity * 100)}
            onChange={(val) => updateObject(obj.id, { opacity: val / 100 })}
            min={20}
            max={90}
            unit="%"
            isOpen={showOpacity}
            onToggle={(open) => {
              setShowOpacity(open);
              if (open) setShowRadius(false);
            }}
            icon={<MoonStar size={14} />}
            title="Spotlight Dim"
          />

          <div className="xs-toolbar-divider" />

          <SliderToggle
            value={obj.cornerRadius}
            onChange={(val) => updateObject(obj.id, { cornerRadius: val })}
            min={0}
            max={64}
            isOpen={showRadius}
            onToggle={(open) => {
              setShowRadius(open);
              if (open) setShowOpacity(false);
            }}
            icon={<Focus size={14} />}
            title="Spotlight Radius"
          />
        </div>
      )}
    </div>,
    overlay
  );
}
