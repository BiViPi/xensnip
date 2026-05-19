import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./Delay.css";

interface DelayTick {
  remaining_ms: number;
  total_ms: number;
}

export function Delay() {
  const initialSeconds = (() => {
    const raw = new URLSearchParams(window.location.search).get("seconds");
    const seconds = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  })();

  const [remaining, setRemaining] = useState<number | null>(
    initialSeconds ? initialSeconds * 1000 : null,
  );
  const [total, setTotal] = useState<number | null>(
    initialSeconds ? initialSeconds * 1000 : null,
  );

  useEffect(() => {
    let unlistenStarted: (() => void) | undefined;
    let unlistenCancelled: (() => void) | undefined;
    let unlistenFired: (() => void) | undefined;
    let unlistenTheme: (() => void) | undefined;
    let countdownTimer: number | null = null;

    const restartCountdown = (nextTotalMs: number) => {
      setRemaining(nextTotalMs);
      setTotal(nextTotalMs);

      if (countdownTimer !== null) {
        window.clearInterval(countdownTimer);
      }

      const startedAt = Date.now();
      countdownTimer = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const nextRemaining = Math.max(0, nextTotalMs - elapsed);
        setRemaining(nextRemaining);
        if (nextRemaining <= 0 && countdownTimer !== null) {
          window.clearInterval(countdownTimer);
          countdownTimer = null;
        }
      }, 30);
    };

    const setup = async () => {
      try {
        const settings = await invoke<{ theme: string }>("settings_load");
        document.documentElement.dataset.theme = settings.theme;
      } catch (err) {
        console.error("Failed to load settings theme:", err);
      }

      unlistenStarted = await listen<DelayTick>("capture://delay-started", (event) => {
        restartCountdown(event.payload.total_ms);
      });

      unlistenCancelled = await listen("capture://delay-cancelled", async () => {
        await getCurrentWindow().close();
        if (countdownTimer !== null) {
          window.clearInterval(countdownTimer);
          countdownTimer = null;
        }
        setRemaining(null);
        setTotal(null);
      });

      unlistenFired = await listen("capture://delay-fired", async () => {
        await getCurrentWindow().close();
        if (countdownTimer !== null) {
          window.clearInterval(countdownTimer);
          countdownTimer = null;
        }
        setRemaining(null);
        setTotal(null);
      });

      unlistenTheme = await listen<string>("theme-changed", (event) => {
        document.documentElement.dataset.theme = event.payload;
      });
    };

    setup();
    if (initialSeconds) {
      restartCountdown(initialSeconds * 1000);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        invoke("capture_cancel").catch(console.error);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (unlistenStarted) unlistenStarted();
      if (unlistenCancelled) unlistenCancelled();
      if (unlistenFired) unlistenFired();
      if (unlistenTheme) unlistenTheme();
      if (countdownTimer !== null) {
        window.clearInterval(countdownTimer);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialSeconds]);

  const handleCancel = () => {
    invoke("capture_cancel").catch(console.error);
  };

  if (remaining === null) return null;

  const seconds = Math.ceil(remaining / 1000);
  const progress = total ? Math.max(0, Math.min(1, remaining / total)) : 1;

  return (
    <div className="xs-delay-overlay">
      <div className="xs-delay-card">
        <div className="xs-delay-header">
          <div className="xs-delay-icon-box">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 9V7a2 2 0 0 1 2-2h2" />
              <path d="M15 5h2a2 2 0 0 1 2 2v2" />
              <path d="M19 15v2a2 2 0 0 1-2 2h-2" />
              <path d="M9 19H7a2 2 0 0 1-2-2v-2" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" strokeDasharray="2 2" />
            </svg>
          </div>
          
          <div className="xs-delay-title-group">
            <h2 className="xs-delay-title">Capturing in</h2>
            <p className="xs-delay-subtext">Keep the target window visible</p>
          </div>

          <div className="xs-delay-number-box">
            <span className="xs-delay-number">{seconds}</span>
          </div>
        </div>

        <div className="xs-delay-progress-bar-container">
          <div
            className="xs-delay-progress-bar-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="xs-delay-footer">
          <button className="xs-delay-cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
