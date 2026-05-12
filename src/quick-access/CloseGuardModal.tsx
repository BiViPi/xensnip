import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export function CloseGuardModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="xs-modal-overlay">
      <div className="xs-modal-content xs-guard-modal">
        <button className="xs-modal-close-btn" onClick={onCancel}>
          <X size={18} />
        </button>

        <div className="xs-guard-icon-box">
          <AlertTriangle size={24} />
        </div>

        <div className="xs-modal-title">Unsaved Changes</div>
        
        <div className="xs-modal-body">
          <p>
            You have unsaved edits to this screenshot.<br />
            Closing now will discard your annotations<br />
            and crop changes.
          </p>
        </div>

        <div className="xs-modal-footer">
          <button className="xs-modal-btn xs-btn-destructive" onClick={onConfirm}>
            <Trash2 size={16} />
            Discard and Close
          </button>
          <button className="xs-modal-btn xs-btn-cancel" onClick={onCancel}>
            Keep Editing
          </button>
        </div>
      </div>
    </div>
  );
}
