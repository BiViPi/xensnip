import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Copy, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { useMeasureStore } from './store';

interface OCRResultToolbarProps {
  onDismiss: () => void;
  scale: number;
}

export function OCRResultToolbar({ onDismiss, scale }: OCRResultToolbarProps) {
  const { ocrStatus, ocrText, ocrError, activeUtility, ocrRegion } = useMeasureStore();
  const [copied, setCopied] = useState(false);

  if (
    activeUtility !== 'ocr_extract' ||
    !ocrRegion ||
    ocrStatus === 'idle' ||
    ocrStatus === 'selecting'
  ) {
    return null;
  }

  const copyToClipboard = () => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const chipLeft = (ocrRegion.x + ocrRegion.width / 2) * scale;
  const chipTop = Math.max(10, ocrRegion.y * scale - 18);

  const renderBody = () => {
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
          <span className="xs-ocr-chip-label">{ocrError ? 'Failed' : 'Error'}</span>
        </>
      );
    }

    const hasText = Boolean(ocrText);

    return (
      <>
        <button
          className="xs-toolbar-btn xs-toolbar-btn-primary xs-ocr-chip-btn"
          onClick={copyToClipboard}
          disabled={!hasText}
          title={hasText ? 'Copy extracted text' : 'No text detected'}
        >
          {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
          <span className="xs-ocr-chip-label">
            {hasText ? (copied ? 'Copied' : 'Copy Text') : 'No text'}
          </span>
        </button>
      </>
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
        zIndex: 1002
      }}
    >
      <div className="xs-ocr-chip-body">
        {renderBody()}
      </div>
      <button
        className="xs-toolbar-btn xs-ocr-chip-close"
        onClick={onDismiss}
        title="Dismiss OCR result"
      >
          <X size={14} />
      </button>
    </div>,
    overlay
  );
}
