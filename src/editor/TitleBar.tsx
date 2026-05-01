import { getCurrentWindow } from "@tauri-apps/api/window";

interface Props {
  title: string;
  onClose?: () => void;
  dark?: boolean;
}

export function TitleBar({ title, onClose, dark = true }: Props) {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => {
    if (onClose) onClose();
    else appWindow.close();
  };

  return (
    <div 
      data-tauri-drag-region 
      className={`xs-titlebar ${dark ? 'dark' : 'light'}`}
    >
      <div className="xs-titlebar-left">
        <span className="xs-titlebar-text">{title}</span>
      </div>
      
      <div className="xs-titlebar-right">
        <button onClick={handleMinimize} className="xs-titlebar-btn minimize">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="currentColor" x="3" y="5.5" width="6" height="1" /></svg>
        </button>
        <button onClick={handleMaximize} className="xs-titlebar-btn maximize">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="none" stroke="currentColor" x="3.5" y="3.5" width="5" height="5" /></svg>
        </button>
        <button onClick={handleClose} className="xs-titlebar-btn close">
          <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M3 3 L9 9 M3 9 L9 3" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
      </div>

      <style>{`
        .xs-titlebar {
          height: 38px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          user-select: none;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1000;
          background: transparent;
        }
        .xs-titlebar-text {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.6;
        }
        .dark .xs-titlebar-text { color: #fff; }
        .light .xs-titlebar-text { color: #000; }

        .xs-titlebar-right {
          display: flex;
          gap: 0;
          height: 100%;
          margin-right: -12px; /* Pull to edge */
        }
        .xs-titlebar-btn {
          width: 46px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: currentColor;
          cursor: pointer;
          transition: background 0.2s;
        }
        .dark .xs-titlebar-btn { color: #fff; opacity: 0.7; }
        .light .xs-titlebar-btn { color: #000; opacity: 0.7; }

        .xs-titlebar-btn:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }
        .light .xs-titlebar-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .xs-titlebar-btn.close:hover {
          background: #e81123 !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
}
