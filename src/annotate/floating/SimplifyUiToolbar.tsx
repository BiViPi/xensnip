import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, MoonStar, Ghost, Droplets } from 'lucide-react';
import { useAnnotationStore } from '../state/store';
import { SimplifyUiObject } from '../state/types';
import { SliderToggle } from './SliderToggle';
import { RadiusToggle } from './RadiusToggle';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: SimplifyUiObject;
}

export function SimplifyUiToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showDim, setShowDim] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const [showSaturation, setShowSaturation] = useState(false);
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
            value={Math.round(obj.dimOpacity * 100)}
            onChange={(val) => updateObject(obj.id, { dimOpacity: val / 100 })}
            min={0}
            max={100}
            unit="%"
            isOpen={showDim}
            onToggle={(open) => {
              setShowDim(open);
              if (open) {
                setShowBlur(false);
                setShowSaturation(false);
                setShowRadius(false);
              }
            }}
            icon={<MoonStar size={14} />}
            title="Simplify UI Dim"
          />

          <div className="xs-toolbar-divider" />

          <SliderToggle
            value={obj.blurRadius}
            onChange={(val) => updateObject(obj.id, { blurRadius: val })}
            min={0}
            max={16}
            isOpen={showBlur}
            onToggle={(open) => {
              setShowBlur(open);
              if (open) {
                setShowDim(false);
                setShowSaturation(false);
                setShowRadius(false);
              }
            }}
            icon={<Ghost size={14} />}
            title="Simplify UI Soften"
          />

          <div className="xs-toolbar-divider" />

          <SliderToggle
            value={Math.round(obj.saturation * 100)}
            onChange={(val) => updateObject(obj.id, { saturation: val / 100 })}
            min={0}
            max={100}
            unit="%"
            isOpen={showSaturation}
            onToggle={(open) => {
              setShowSaturation(open);
              if (open) {
                setShowDim(false);
                setShowBlur(false);
                setShowRadius(false);
              }
            }}
            icon={<Droplets size={14} />}
            title="Simplify UI Desaturate"
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
                setShowDim(false);
                setShowBlur(false);
                setShowSaturation(false);
              }
            }}
          />
        </div>
      )}
    </div>,
    overlay
  );
}
