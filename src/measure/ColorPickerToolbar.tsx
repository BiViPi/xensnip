import { createPortal } from 'react-dom';
import { Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Props {
  sample: { hex: string; rgb: [number, number, number] };
  anchor: { x: number; y: number };
  frozen: boolean;
}

export function ColorPickerToolbar({ sample, anchor, frozen }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [sample.hex, frozen]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sample.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  // Render near cursor with a small offset
  const left = anchor.x;
  const top = anchor.y - 40;

  return createPortal(
    <div
      className="xs-floating-toolbar"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        padding: '6px 8px',
        gap: '8px'
      }}
    >
      <div 
        className="xs-color-preview-swatch"
        style={{ 
          width: 24, height: 24, 
          backgroundColor: sample.hex,
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.1)'
        }} 
      />
      <div className="xs-color-hex" style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', minWidth: 60, userSelect: 'all' }}>
        {sample.hex}
      </div>
      <div className="xs-toolbar-divider" />
      <button 
        className="xs-toolbar-btn" 
        onClick={copyToClipboard}
        title={frozen ? "Copy HEX" : "Click canvas to freeze and copy"}
      >
        {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
      </button>
    </div>,
    overlay
  );
}
