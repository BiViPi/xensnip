import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { PixelateObject } from '../state/types';
import { ChevronRight, ChevronLeft, Copy, Trash2 } from 'lucide-react';
import { SliderToggle } from './SliderToggle';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: PixelateObject;
}

export function PixelateToolbar({ anchor, obj }: Props) {
  const { updateObject, removeObject, addObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showPixelSize, setShowPixelSize] = useState(false);

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

          {/* Pixel Size */}
          <SliderToggle
            value={obj.pixelSize}
            min={4}
            max={48}
            step={2}
            onChange={(val) => updateObject(obj.id, { pixelSize: val })}
            isOpen={showPixelSize}
            onToggle={(open) => setShowPixelSize(open)}
            title="Pixel Size"
            unit="px"
          />

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
