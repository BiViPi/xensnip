export interface ToastProps {
  message: string;
  subtitle?: string;
  type: "success" | "error";
  onClose?: () => void;
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div className={`xs-toast ${type}`}>
      <div className="toast-icon">
        <CheckIcon />
      </div>
      <div className="toast-body">
        <div className="toast-title">{message}</div>
      </div>
      {onClose && (
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
