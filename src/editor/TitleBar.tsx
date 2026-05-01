import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";

interface Props {
  title?: string;
  onClose?: () => void;
  showMinimize?: boolean;
  showMaximize?: boolean;
  showClose?: boolean;
  dark?: boolean;
}

export function TitleBar({ 
  title = "Xensnip", 
  onClose, 
  showMinimize = true, 
  showMaximize = true, 
  showClose = true,
  dark = true 
}: Props) {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Initial state check
    const checkState = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };
    void checkState();

    // Listen for resize/maximize events to update UI
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });
    
    return () => { void unlisten.then(fn => fn()); };
  }, [appWindow]);

  const handleMinimize = () => {
    console.log("[TitleBar] Minimize clicked");
    void appWindow.minimize();
  };
  
  const handleMaximize = async () => {
    console.log("[TitleBar] Toggling Maximize. Current isMaximized state:", isMaximized);
    await appWindow.toggleMaximize();
    
    // Give OS a tiny bit of time to complete the animation/state change
    setTimeout(async () => {
      const actualState = await appWindow.isMaximized();
      setIsMaximized(actualState);
      console.log("[TitleBar] Updated isMaximized state to:", actualState);
    }, 150);
  };
  
  const handleClose = () => {
    console.log("[TitleBar] Close clicked");
    if (onClose) onClose();
    else appWindow.close();
  };

  return (
    <div className={`xs-titlebar ${dark ? 'dark' : 'light'}`}>
      {/* Left side: Logo & Title */}
      <div className="xs-titlebar-left">
        <img 
          src={logo} 
          alt="Xensnip" 
          className="xs-titlebar-logo"
        />
        <span className="xs-titlebar-text">{title}</span>
      </div>

      {/* Drag Area - Expanded to fill middle */}
      <div 
        data-tauri-drag-region 
        onMouseDown={() => {
          void appWindow.startDragging().catch(() => {});
        }}
        className="xs-titlebar-drag-area"
      />
      
      {/* Controls Area - High z-index to stay above drag area */}
      <div className="xs-titlebar-controls">
        {showMinimize && (
          <button onClick={handleMinimize} className="xs-titlebar-btn" title="Minimize">
            <svg width="14" height="14" viewBox="0 0 16 16"><rect fill="currentColor" x="3" y="7.5" width="10" height="1" /></svg>
          </button>
        )}
        {showMaximize && (
          <button onClick={handleMaximize} className="xs-titlebar-btn" title={isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? (
              <svg width="14" height="14" viewBox="0 0 16 16">
                <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M5.5 3.5h7v7M3.5 5.5h7v7h-7z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16">
                <rect fill="none" stroke="currentColor" strokeWidth="1.2" x="3.5" y="3.5" width="9" height="9" />
              </svg>
            )}
          </button>
        )}
        {showClose && (
          <button onClick={handleClose} className="xs-titlebar-btn close" title="Close">
            <svg width="14" height="14" viewBox="0 0 16 16">
              <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M4 4 L12 12 M4 12 L12 4" />
            </svg>
          </button>
        )}
      </div>

      <style>{`
        .xs-titlebar {
          height: 40px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10000; /* Extremely high z-index */
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .xs-titlebar-left {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 14px;
          pointer-events: none;
          flex-shrink: 0;
        }

        .xs-titlebar-logo {
          width: 22px;
          height: 22px;
          object-fit: contain;
        }

        .xs-titlebar-text {
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
          letter-spacing: -0.01em;
          opacity: 0.9;
        }

        .xs-titlebar-drag-area {
          flex: 1;
          height: 100%;
          cursor: default;
          background: rgba(0, 0, 0, 0.001);
        }

        .xs-titlebar-controls {
          display: flex;
          height: 100%;
          padding-right: 2px;
          position: relative;
          z-index: 10001; /* Higher than drag area */
        }
        
        .xs-titlebar-btn {
          width: 48px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #f8fafc;
          opacity: 0.7;
          cursor: pointer;
          transition: all 0.1s ease;
          position: relative;
          z-index: 10002;
        }

        .xs-titlebar-btn:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }

        .xs-titlebar-btn.close:hover {
          background: #e81123 !important;
          opacity: 1;
        }

        .xs-titlebar-btn svg {
          display: block;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
