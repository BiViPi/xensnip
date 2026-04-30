import { captureStartRegion, captureStartWindow } from "../ipc/index";

interface Props {
  showToast: (message: string, type?: "success" | "error") => void;
}

export function EmptyState({ showToast }: Props) {
  const handleRegion = async () => {
    try {
      await captureStartRegion();
    } catch {
      showToast("Capture already in progress.", "error");
    }
  };

  const handleWindow = async () => {
    try {
      await captureStartWindow();
    } catch {
      showToast("Capture already in progress.", "error");
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
