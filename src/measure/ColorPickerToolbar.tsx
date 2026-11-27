import { createPortal } from 'react-dom';
import { Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ColorSample } from './store';

interface Props {
  sample: ColorSample;
  anchor: { x: number; y: number };
  frozen: boolean;
}

export function ColorPickerToolbar({ sample, anchor, frozen }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!frozen) {
      setCopied(false);
      return;
    }
    setCopied(true);
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [sample.hex, frozen]);

  const copyToClipboard = () => {
    Promise.resolve(navigator.clipboard?.writeText?.(sample.hex)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const overlay = document.getElementById('annotation-ui-overlay');
  if (!overlay) return null;

  const halfWidth = sample.patch ? 112 : 95;
  const toolbarHeight = 56;
  const rawLeft = anchor.x;
  const left =
    overlay.clientWidth > halfWidth * 2
      ? Math.max(halfWidth, Math.min(overlay.clientWidth - halfWidth, rawLeft))
      : Math.max(halfWidth, rawLeft);

  const rawTop = anchor.y < 76 ? anchor.y + 20 : anchor.y - 62;
  const top =
    overlay.clientHeight > toolbarHeight
      ? Math.max(8, Math.min(overlay.clientHeight - toolbarHeight - 8, rawTop))
      : Math.max(8, rawTop);

  const btnTitle = frozen ? 'Copy HEX' : 'Click canvas to freeze and copy';

  return createPortal(
    <div
      className="xs-floating-toolbar xs-color-picker-toolbar"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        padding: '6px 8px',
        gap: '8px',
      }}
    >
      {sample.patch && (
        <div
          className="xs-color-loupe"
          aria-label="7x7 pixel loupe"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 6px)',
            gridTemplateRows: 'repeat(7, 6px)',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
          }}
        >
          {sample.patch.map((row, rIdx) =>
            row.map((cellHex, cIdx) => {
              const isCenter = rIdx === 3 && cIdx === 3;
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="xs-color-loupe-cell"
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: cellHex,
                    boxSizing: 'border-box',
                    border: isCenter ? '1px solid #ffffff' : undefined,
                  }}
                />
              );
            })
          )}
        </div>
      )}

      <div
        className="xs-color-preview-swatch"
        style={{
          width: 28,
          height: 28,
          backgroundColor: sample.hex,
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.18)',
          flexShrink: 0,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4 }}>
        <div
          className="xs-color-hex"
          style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', userSelect: 'all', lineHeight: 1 }}
        >
          {sample.hex}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', userSelect: 'all', lineHeight: 1 }}>
          rgb({sample.rgb[0]}, {sample.rgb[1]}, {sample.rgb[2]})
        </div>
      </div>

      <div className="xs-toolbar-divider" />

      <button
        className="xs-toolbar-btn"
        onClick={copyToClipboard}
        aria-label={btnTitle}
        title={btnTitle}
      >
        {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
      </button>
    </div>,
    overlay
  );
}
