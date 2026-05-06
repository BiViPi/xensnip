import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationStore } from '../state/store';
import { TextObject } from '../state/types';
import { ChevronRight, ChevronLeft, Type } from 'lucide-react';
import { SliderToggle } from './SliderToggle';

interface Props {
  anchor: { left: number; top: number; width: number; height: number };
  obj: TextObject;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

export function TextToolbar({ anchor, obj }: Props) {
  const { updateObject, toolbarCollapsed, setToolbarCollapsed } = useAnnotationStore();
  const [showSizes, setShowSizes] = useState(false);

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
          
          {COLORS.map(c => (
            <button 
              key={c}
              className={`xs-color-chip ${obj.fill === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => updateObject(obj.id, { fill: c })}
            />
          ))}

          <div className="xs-toolbar-divider" />

          <SliderToggle
            value={obj.fontSize}
            onChange={(fontSize: number) => updateObject(obj.id, { fontSize })}
            icon={<Type size={14} />}
            title="Font Size"
            min={8}
            max={128}
            isOpen={showSizes}
            onToggle={setShowSizes}
          />
        </div>
      )}
    </div>,
    overlay
  );
}
