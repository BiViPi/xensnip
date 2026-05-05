import { createPortal } from 'react-dom';
import { Copy, Check, X, Loader2, ScanText } from 'lucide-react';
import { useState } from 'react';
import { useMeasureStore } from './store';

export function OCRResultToolbar() {
  const { ocrStatus, ocrText, ocrError, setOcrStatus, activeUtility } = useMeasureStore();
  const [copied, setCopied] = useState(false);

  if (activeUtility !== 'ocr_extract' || ocrStatus === 'idle' || ocrStatus === 'selecting') return null;

  const copyToClipboard = () => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  return createPortal(
    <div
      className="xs-floating-toolbar ocr-toolbar"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '80px',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '360px',
        maxWidth: '500px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        gap: '12px',
        zIndex: 1002
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: 6, background: 'rgba(59, 130, 246, 0.15)', borderRadius: 8, color: '#60a5fa' }}>
            <ScanText size={16} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', letterSpacing: '0.01em' }}>
            Extracted Text
          </span>
        </div>
        <button 
          onClick={() => setOcrStatus('idle')} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            color: '#94a3b8', 
            cursor: 'pointer', 
            padding: 6,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <X size={14} />
        </button>
      </div>

      {ocrStatus === 'running' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0', color: '#94a3b8', justifyContent: 'center' }}>
          <Loader2 size={28} className="xs-animate-spin" style={{ color: '#60a5fa' }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Scanning image for text...</span>
        </div>
      )}

      {ocrStatus === 'error' && (
        <div style={{ 
          color: '#fca5a5', 
          fontSize: 13, 
          padding: '16px', 
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          Could not extract text: {ocrError}
        </div>
      )}

      {ocrStatus === 'ready' && (
        <>
          <div style={{ 
            maxHeight: '180px', 
            overflowY: 'auto', 
            background: 'rgba(0, 0, 0, 0.2)', 
            padding: '12px 14px', 
            borderRadius: '8px',
            fontSize: 14,
            color: '#f1f5f9',
            whiteSpace: 'pre-wrap',
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.6,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {ocrText || (
              <span style={{ color: '#64748b', fontStyle: 'italic' }}>No recognizable text found in the selected area.</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button 
              onClick={copyToClipboard}
              disabled={!ocrText}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: ocrText ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                color: ocrText ? '#ffffff' : '#64748b',
                border: '1px solid',
                borderColor: ocrText ? '#60a5fa' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                fontSize: 13,
                fontWeight: 600,
                cursor: ocrText ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: ocrText ? '0 2px 8px -2px rgba(59, 130, 246, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (ocrText) e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (ocrText) e.currentTarget.style.background = '#3b82f6';
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
        </>
      )}
    </div>,
    overlay
  );
}
