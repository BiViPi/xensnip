import { captureStartRegion, captureStartWindow } from "../ipc/index";

interface Props {
  showToast: (message: string, type?: "success" | "error", subtitle?: string) => void;
}

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44, opacity: 0.5 }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
  </svg>
);

export function EmptyState({ showToast }: Props) {
  const handleRegion = async () => { try { await captureStartRegion(); } catch { showToast("Capture active", "error"); } };
  const handleWindow = async () => { try { await captureStartWindow(); } catch { showToast("Capture active", "error"); } };

  return (
    <div className="empty-state">
      <div className="placeholder-card">
        <CameraIcon />
        <div style={{ margin: '16px 0' }}>
          <div className="placeholder-title">No capture active</div>
          <div className="placeholder-text">Capture a screenshot to start.</div>
        </div>
        <div className="empty-actions">
          <button className="empty-btn" onClick={handleRegion}>Region</button>
          <button className="empty-btn secondary" onClick={handleWindow}>Window</button>
        </div>
      </div>
    </div>
  );
}
