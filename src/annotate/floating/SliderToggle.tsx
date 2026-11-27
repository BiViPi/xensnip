import React, { useCallback, useEffect, useRef } from 'react';
import { StrokeWidthIcon } from './ToolbarIcons';
import { Tooltip } from '../../editor/Tooltip';
import { beginHistoryGesture, endHistoryGesture } from '../../editor/historyBridge';

interface Props {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  title?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function SliderToggle({
  value,
  onChange,
  min = 1,
  max = 24,
  step = 1,
  unit = 'px',
  title,
  icon,
  isOpen,
  onToggle
}: Props) {
  const gestureActiveRef = useRef(false);

  const finishGesture = useCallback(() => {
    if (!gestureActiveRef.current) return;
    gestureActiveRef.current = false;
    window.removeEventListener('pointerup', finishGesture);
    window.removeEventListener('pointercancel', finishGesture);
    window.removeEventListener('mouseup', finishGesture);
    endHistoryGesture();
  }, []);

  const startGesture = useCallback(() => {
    if (gestureActiveRef.current) return;
    gestureActiveRef.current = true;
    beginHistoryGesture();
    window.addEventListener('pointerup', finishGesture);
    window.addEventListener('pointercancel', finishGesture);
    window.addEventListener('mouseup', finishGesture);
  }, [finishGesture]);

  useEffect(() => {
    if (!isOpen) {
      finishGesture();
    }
    return () => {
      finishGesture();
    };
  }, [isOpen, finishGesture]);

  return (
    <div style={{ position: 'relative' }}>
      <Tooltip text={title || "Adjustment"} position="top">
        <button
          className={`xs-toolbar-btn ${isOpen ? 'active' : ''}`}
          aria-label={title || "Adjustment"}
          onClick={() => onToggle(!isOpen)}
        >
          {icon || <StrokeWidthIcon />}
        </button>
      </Tooltip>
      {isOpen && (
        <div className="xs-toolbar-slider-popover">
          <div className="xs-compact-slider-row">
            <div className="xs-slider-track-container" style={{ width: '80px', '--fill-width': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onPointerDown={startGesture}
                onMouseDown={startGesture}
                onBlur={finishGesture}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="xs-slider-input"
              />
            </div>
            <span className="xs-slider-value-text">{value}{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}
