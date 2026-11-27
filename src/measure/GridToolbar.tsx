import { useState } from 'react';
import { createPortal } from 'react-dom';
import { EyeOff, Grid } from 'lucide-react';
import { useMeasureStore } from './store';
import { useAnnotationStore } from '../annotate/state/store';
import { SliderToggle } from '../annotate/floating/SliderToggle';
import { Tooltip } from '../editor/Tooltip';

const GRID_SPACINGS = [16, 32, 50, 100] as const;

export function GridToolbar() {
  const { gridVisible, gridSpacing, gridOpacity, setGridSpacing, setGridOpacity, setGridVisible } =
    useMeasureStore();
  const selectedIds = useAnnotationStore((s) => s.selectedIds);
  const [showOpacity, setShowOpacity] = useState(false);

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay || !gridVisible || selectedIds.length > 0) {
    return null;
  }

  return createPortal(
    <div
      className="xs-floating-toolbar xs-grid-toolbar"
      style={{
        position: 'absolute',
        left: '50%',
        top: '12px',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        zIndex: 999,
      }}
    >
      <div className="xs-toolbar-section">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, paddingLeft: 4, color: '#94a3b8', fontSize: 12 }}>
          <Grid size={13} />
        </span>

        {GRID_SPACINGS.map((spacing) => (
          <button
            key={spacing}
            className={`xs-toolbar-btn ${gridSpacing === spacing ? 'active' : ''}`}
            aria-label={`Grid ${spacing}px`}
            title={`${spacing}px grid spacing`}
            onClick={() => setGridSpacing(spacing)}
            style={{ width: 'auto', padding: '0 7px', fontSize: 11, fontWeight: 600 }}
          >
            {spacing}
          </button>
        ))}

        <div className="xs-toolbar-divider" />

        <SliderToggle
          value={Math.round(gridOpacity * 100)}
          onChange={(val) => setGridOpacity(val / 100)}
          min={5}
          max={80}
          step={5}
          unit="%"
          isOpen={showOpacity}
          onToggle={setShowOpacity}
          title="Grid Opacity"
        />

        <div className="xs-toolbar-divider" />

        <Tooltip text="Hide Grid" position="bottom">
          <button
            className="xs-toolbar-btn"
            aria-label="Hide Grid"
            onClick={() => setGridVisible(false)}
          >
            <EyeOff size={14} />
          </button>
        </Tooltip>
      </div>
    </div>,
    overlay
  );
}
