import { createPortal } from 'react-dom';
import { usePrivacyStore } from './store';
import { X } from 'lucide-react';

interface Props {
  scale: number;
}

export function SmartRedactOverlay({ scale }: Props) {
  const { candidates, updateCandidateStatus, status } = usePrivacyStore();
  const overlay = document.getElementById('annotation-ui-overlay');

  if (!overlay || status !== 'ready' || candidates.length === 0) return null;

  return createPortal(
    <div className="xs-smart-redact-overlay-container" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
      {candidates.map((c) => {
        if (c.status === 'rejected') return null;
        
        return (
          <div
            key={c.id}
            className="xs-smart-redact-candidate-box"
            style={{
              position: 'absolute',
              left: `${c.x * scale}px`,
              top: `${c.y * scale}px`,
              width: `${c.width * scale}px`,
              height: `${c.height * scale}px`,
              border: '2px solid #fbbf24',
              background: 'rgba(251, 191, 36, 0.15)',
              borderRadius: '2px',
              pointerEvents: 'auto',
              boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateCandidateStatus(c.id, 'rejected');
              }}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                margin: '-8px -8px 0 0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                padding: 0
              }}
              title="Reject"
            >
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>,
    overlay
  );
}
