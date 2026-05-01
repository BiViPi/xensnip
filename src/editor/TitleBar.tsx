import { getCurrentWindow } from "@tauri-apps/api/window";

interface Props {
  title: string;
  onClose?: () => void;
  showMinimize?: boolean;
  showMaximize?: boolean;
  showClose?: boolean;
  dark?: boolean;
}

export function TitleBar({ 
  title, 
  onClose, 
  showMinimize = true, 
  showMaximize = true, 
  showClose = true,
  dark = true 
}: Props) {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => {
    if (onClose) onClose();
    else appWindow.close();
  };

  return (
    <div className={`xs-titlebar ${dark ? 'dark' : 'light'}`}>
      {/* Dedicated Drag Strip - Using startDragging for 100% reliability */}
      <div 
        data-tauri-drag-region 
        onMouseDown={() => {
          console.log("[TitleBar] MouseDown on drag area. Triggering startDragging...");
          void appWindow.startDragging().catch((err) => {
            console.error("[TitleBar] startDragging failed:", err);
          });
        }}
        className="xs-titlebar-drag-area"
      >
        <span className="xs-titlebar-text">{title}</span>
      </div>
      
      {/* Controls Area - This area MUST NOT have data-tauri-drag-region */}
      <div className="xs-titlebar-controls">
        {showMinimize && (
          <button onClick={handleMinimize} className="xs-titlebar-btn minimize" title="Minimize">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="currentColor" x="3" y="5.5" width="6" height="1" /></svg>
          </button>
        )}
        {showMaximize && (
          <button onClick={handleMaximize} className="xs-titlebar-btn maximize" title="Maximize">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="none" stroke="currentColor" x="3.5" y="3.5" width="5" height="5" /></svg>
          </button>
        )}
        {showClose && (
          <button onClick={handleClose} className="xs-titlebar-btn close" title="Close">
            <svg width="12" height="12" viewBox="0 0 12 12"><path fill="none" stroke="currentColor" strokeWidth="1.2" d="M3.5 3.5 L8.5 8.5 M3.5 8.5 L8.5 3.5" /></svg>
          </button>
        )}
      </div>

      <style>{`
        .xs-titlebar {
          height: 38px;
          width: 100%;
          display: flex;
          align-items: center;
          user-select: none;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1000;
          background: transparent;
        }
        
        .xs-titlebar-drag-area {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: center;
          padding-left: 12px;
          cursor: default;
          background: rgba(0, 0, 0, 0.001); /* Invisible but 'hittable' */
          pointer-events: auto;
        }

        .xs-titlebar-text {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          opacity: 0.5;
          text-transform: uppercase;
        }
        .dark .xs-titlebar-text { color: #fff; }
        .light .xs-titlebar-text { color: #000; }

        .xs-titlebar-controls {
          display: flex;
          height: 100%;
          z-index: 1001; /* Ensure buttons are above drag layer if any */
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
          transition: background 0.1s, opacity 0.1s;
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
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
