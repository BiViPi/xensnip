import { captureStartRegion, captureStartWindow } from "../ipc/index";

export function EmptyState() {
  const handleRegion = async () => {
    try {
      await captureStartRegion();
    } catch {
      // Small toast or silent failure if capture already in progress
    }
  };

  const handleWindow = async () => {
    try {
      await captureStartWindow();
    } catch {
      // Small toast or silent failure
    }
  };

  return (
    <div className="empty-state">
      <div className="placeholder-card">
        <p className="placeholder-text">Press a hotkey to capture, or use the buttons below.</p>
        <div className="empty-actions">
          <button className="empty-btn" onClick={handleRegion}>
            Region Capture
          </button>
          <button className="empty-btn" onClick={handleWindow}>
            Window Capture
          </button>
        </div>
      </div>
    </div>
  );
}
