import { getCurrentWindow, type Window } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import "./TitleBar.css";

interface Props {
  title?: string;
  onClose?: () => void;
  showMinimize?: boolean;
  showMaximize?: boolean;
  showClose?: boolean;
}

export function TitleBar({
  title = "Xensnip",
  onClose,
  showMinimize = true,
  showMaximize = true,
  showClose = true,
}: Props) {
  const [appWindow, setAppWindow] = useState<Window | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    try {
      setAppWindow(getCurrentWindow());
    } catch (err) {
      console.error("[TitleBar] Failed to resolve current window", err);
    }
  }, []);

  useEffect(() => {
    if (!appWindow) return;

    // Initial state check
    const checkState = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };
    void checkState();

    // Listen for resize/maximize events to update UI state
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => { void unlisten.then(fn => fn()); };
  }, [appWindow]);

  const handleMinimize = () => {
    if (!appWindow) return;
    console.log("[TitleBar] Action: Minimize");
    void appWindow.minimize();
  };

  const handleMaximize = async () => {
    if (!appWindow) return;
    console.log("[TitleBar] Action: Maximize/Restore Toggle. Current UI State:", isMaximized);
    // Explicitly check current state from OS before acting
    const currentlyMaximized = await appWindow.isMaximized();

    try {
      if (currentlyMaximized) {
        console.log("[TitleBar] Command: unmaximize()");
        await appWindow.unmaximize();
      } else {
        console.log("[TitleBar] Command: maximize()");
        await appWindow.maximize();
      }

      // Update state after action
      setTimeout(async () => {
        const newState = await appWindow.isMaximized();
        setIsMaximized(newState);
      }, 100);
    } catch (err) {
      console.error("[TitleBar] Maximize error:", err);
      // Last resort fallback
      void appWindow.toggleMaximize();
    }
  };

  const handleClose = () => {
    console.log("[TitleBar] Action: Close");
    if (onClose) onClose();
    else if (appWindow) void appWindow.close();
  };

  return (
    <div className="xs-titlebar">
      {/* Left side: Logo & Title */}
      <div className="xs-titlebar-left">
        <img src={logo} alt="Xensnip" className="xs-titlebar-logo" />
        <span className="xs-titlebar-text">{title}</span>
      </div>

      {/* Drag Area - Middle space */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleMaximize}
        className="xs-titlebar-drag-area"
      />

      {/* Controls Area - Fixed width to prevent overlap */}
      <div className="xs-titlebar-controls">
        {showMinimize && (
          <button onClick={handleMinimize} className="xs-titlebar-btn" title="Minimize" disabled={!appWindow}>
            <svg width="14" height="14" viewBox="0 0 16 16"><rect fill="currentColor" x="3" y="7.5" width="10" height="1" /></svg>
          </button>
        )}
        {showMaximize && (
          <button onClick={handleMaximize} className="xs-titlebar-btn" title={isMaximized ? "Restore" : "Maximize"} disabled={!appWindow}>
            {isMaximized ? (
              <svg width="14" height="14" viewBox="0 0 16 16">
                <rect x="5.5" y="3.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3.5 5.5 v7 h7 v-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16">
                <rect x="3.5" y="3.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
          </button>
        )}
        {showClose && (
          <button onClick={handleClose} className="xs-titlebar-btn close" title="Close" disabled={!onClose && !appWindow}>
            <svg width="14" height="14" viewBox="0 0 16 16">
              <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M4 4 L12 12 M4 12 L12 4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
