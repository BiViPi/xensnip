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
              border: '1.5px solid rgba(251, 191, 36, 0.6)',
              background: 'rgba(251, 191, 36, 0.08)',
              borderRadius: '3px',
              pointerEvents: 'auto',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
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
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                margin: '-9px -9px 0 0',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                padding: 0,
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s'
              }}
              className="xs-candidate-reject-btn"
              title="Reject"
            >
              <X size={11} strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>,
    overlay
  );
}
