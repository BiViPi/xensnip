import React from 'react';
import { usePrivacyStore, SmartRedactCandidate } from './store';
import { useAnnotationStore } from '../annotate/state/store';
import { detectTextRedactCandidates } from './detectTextRedactCandidates';
import { getCompositionCoordinates } from '../measure/coordinates';
import { Check, X, Sparkles, Loader2 } from 'lucide-react';
import { OpaqueRedactObject } from '../annotate/state/types';

interface Props {
  compositionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function SmartRedactToolbar({ compositionCanvasRef }: Props) {
  const { status, setStatus, scope, selectionRect, candidates, setCandidates, reset, setError, error } = usePrivacyStore();
  const { addObject } = useAnnotationStore();

  const handleDetect = async () => {
    const canvas = compositionCanvasRef.current;
    if (!canvas) return;

    setStatus('detecting');
    setError(null);

    try {
      let region = undefined;
      if (scope === 'selection' && selectionRect) {
        const comp = getCompositionCoordinates(selectionRect.x, selectionRect.y, canvas.width, canvas.height);
        const regionWidth = Math.max(1, Math.min(canvas.width - comp.x, Math.ceil(selectionRect.width)));
        const regionHeight = Math.max(1, Math.min(canvas.height - comp.y, Math.ceil(selectionRect.height)));
        region = {
          x: comp.x,
          y: comp.y,
          width: regionWidth,
          height: regionHeight,
        };
      }

      const results = await detectTextRedactCandidates(canvas, region);
      setCandidates(results);
      setStatus('ready');
    } catch (err: any) {
      console.error('Detection failed:', err);
      setError(err.message || 'Detection failed');
      setStatus('error');
    }
  };

  const handleApplyAll = () => {
    candidates.forEach(c => {
      if (c.status !== 'rejected') {
        applyCandidate(c);
      }
    });
    reset();
  };

  const applyCandidate = (c: SmartRedactCandidate) => {
    const newId = `obj-${Date.now()}-${Math.random()}`;
    const redact: OpaqueRedactObject = {
      id: newId,
      type: 'opaque_redact',
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
      rotation: 0,
      fill: '#000000',
      borderColor: '#000000',
      borderWidth: 0,
      draggable: true,
    };
    addObject(redact);
  };

  if (status === 'idle' && !selectionRect && scope === 'selection') {
    return (
      <div className="xs-ocr-result-toolbar" style={{ bottom: 20 }}>
        <div className="xs-ocr-chip xs-ocr-chip-ready">
          <div className="xs-ocr-chip-body">
            <Sparkles size={14} className="xs-icon-sparkle" />
            <span className="xs-ocr-chip-label">Drag on canvas to select area for AI Redaction</span>
          </div>
          <div className="xs-toolbar-divider" />
          <button className="xs-ocr-chip-btn xs-ocr-chip-close" onClick={reset} title="Cancel">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (status === 'detecting') {
    return (
      <div className="xs-ocr-result-toolbar" style={{ bottom: 20 }}>
        <div className="xs-ocr-chip xs-ocr-chip-running">
          <div className="xs-ocr-chip-body">
            <Loader2 size={14} className="xs-icon-spin" />
            <span className="xs-ocr-chip-label">Detecting sensitive text...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="xs-ocr-result-toolbar" style={{ bottom: 20 }}>
      <div className={`xs-ocr-chip ${status === 'error' ? 'xs-ocr-chip-error' : 'xs-ocr-chip-ready'}`}>
        <div className="xs-ocr-chip-body">
          <Sparkles size={14} className="xs-icon-sparkle" />
          <span className="xs-ocr-chip-label">
            {status === 'idle' ? (scope === 'full_canvas' ? 'Smart Redact (Full Canvas)' : 'Region Selected') : 
             status === 'error' ? `Error: ${error}` : 
             `${candidates.length} candidates found`}
          </span>
        </div>
        
        <div className="xs-toolbar-divider" />
        
        {status === 'idle' && (
          <button className="xs-ocr-chip-btn" onClick={handleDetect}>
            Detect
          </button>
        )}

        {status === 'ready' && candidates.length > 0 && (
          <button className="xs-ocr-chip-btn" onClick={handleApplyAll} title="Apply All">
            <Check size={14} style={{ marginRight: 4 }} /> Apply All
          </button>
        )}

        {status === 'ready' && candidates.length === 0 && (
          <span className="xs-ocr-chip-label" style={{ opacity: 0.6, padding: '0 8px' }}>No text detected</span>
        )}

        <div className="xs-toolbar-divider" />
        
        <button className="xs-ocr-chip-btn xs-ocr-chip-close" onClick={reset} title="Cancel">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
