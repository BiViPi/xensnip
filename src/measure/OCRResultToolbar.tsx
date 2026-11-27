import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Copy, Loader2, ScanText, X } from 'lucide-react';
import { useState } from 'react';
import { useMeasureStore } from './store';

interface OCRResultToolbarProps {
  onDismiss: () => void;
  scale: number;
}

export function OCRResultToolbar({ onDismiss, scale }: OCRResultToolbarProps) {
  const { ocrStatus, ocrText, ocrError, ocrProgress, activeUtility, ocrRegion, setActiveUtility } =
    useMeasureStore();
  const [copied, setCopied] = useState(false);

  if (activeUtility !== 'ocr_extract') {
    return null;
  }

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const handleClose = () => {
    setActiveUtility(null);
    onDismiss();
  };

  if (!ocrRegion || ocrStatus === 'idle' || ocrStatus === 'selecting') {
    return createPortal(
      <div
        className="xs-floating-toolbar xs-ocr-chip xs-ocr-chip-idle"
        style={{
          position: 'absolute',
          left: '50%',
          top: '14px',
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
          zIndex: 1002,
          gap: '8px',
        }}
      >
        <div className="xs-ocr-chip-body" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ScanText size={14} />
          <span className="xs-ocr-chip-label">Drag on canvas to select area</span>
        </div>
        <button
          className="xs-toolbar-btn xs-ocr-chip-close"
          onClick={handleClose}
          title="Dismiss OCR result"
        >
          <X size={14} />
        </button>
      </div>,
      overlay
    );
  }

  const trimmedText = ocrText.trim();
  const hasText = trimmedText.length > 0;

  const copyToClipboard = () => {
    if (!hasText) return;
    Promise.resolve(navigator.clipboard?.writeText?.(trimmedText)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rawLeft = (ocrRegion.x + ocrRegion.width / 2) * scale;
  const chipLeft =
    overlay.clientWidth > 260
      ? Math.max(130, Math.min(overlay.clientWidth - 130, rawLeft))
      : rawLeft;
  const chipTop = Math.max(10, ocrRegion.y * scale - 18);

  const renderBody = () => {
    if (ocrStatus === 'loading') {
      return (
        <>
          <Loader2 size={14} className="xs-animate-spin" />
          <span className="xs-ocr-chip-label">
            {ocrProgress > 0 ? `Loading ${ocrProgress}%` : 'Loading OCR…'}
          </span>
        </>
      );
    }

    if (ocrStatus === 'running') {
      return (
        <>
          <Loader2 size={14} className="xs-animate-spin" />
          <span className="xs-ocr-chip-label">Extracting</span>
        </>
      );
    }

    if (ocrStatus === 'error') {
      return (
        <>
          <AlertTriangle size={14} />
          <span className="xs-ocr-chip-label" title={ocrError ?? ''}>
            {ocrError ? (ocrError.length > 60 ? ocrError.substring(0, 57) + '...' : ocrError) : 'Error'}
          </span>
        </>
      );
    }

    const buttonLabel = hasText ? (copied ? 'Copied' : 'Copy Text') : 'No text detected';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {hasText && (
          <span
            className="xs-ocr-text-preview"
            title={trimmedText}
            style={{
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 12,
              color: '#cbd5e1',
              userSelect: 'text',
            }}
          >
            {trimmedText}
          </span>
        )}
        <button
          className="xs-toolbar-btn xs-toolbar-btn-primary xs-ocr-chip-btn"
          onClick={copyToClipboard}
          disabled={!hasText}
          aria-label={buttonLabel}
          title={hasText ? 'Copy extracted text' : 'No text detected'}
        >
          {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
          <span className="xs-ocr-chip-label">{buttonLabel}</span>
        </button>
      </div>
    );
  };

  return createPortal(
    <div
      className={`xs-floating-toolbar xs-ocr-chip xs-ocr-chip-${ocrStatus}`}
      style={{
        position: 'absolute',
        left: `${chipLeft}px`,
        top: `${chipTop}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        zIndex: 1002,
      }}
    >
      <div className="xs-ocr-chip-body">{renderBody()}</div>
      <button
        className="xs-toolbar-btn xs-ocr-chip-close"
        onClick={handleClose}
        title="Dismiss OCR result"
      >
        <X size={14} />
      </button>
    </div>,
    overlay
  );
}
