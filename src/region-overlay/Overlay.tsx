import { useEffect, useState } from "react";
import { captureRegionConfirm, captureCancel } from "../ipc";
import "./Overlay.css";

export default function Overlay() {
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        await captureCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setCurrentPoint({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setCurrentPoint({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const w = Math.abs(currentPoint.x - startPoint.x);
    const h = Math.abs(currentPoint.y - startPoint.y);

    if (w < 10 || h < 10) {
      // Too small — cancel cleanly; Rust will release the session lock.
      await captureCancel();
      return;
    }

    // NOTE: clientX/clientY in a fullscreen transparent webview on the primary monitor
    // correspond 1:1 to physical pixels only when devicePixelRatio === 1.
    // At higher DPI, Webview2 reports logical pixels (CSS pixels), so we scale by devicePixelRatio
    // to convert to physical pixels before handing off to Rust.
    const dpr = window.devicePixelRatio ?? 1;
    const physX = Math.round(x * dpr);
    const physY = Math.round(y * dpr);
    const physW = Math.round(w * dpr);
    const physH = Math.round(h * dpr);

    try {
      await captureRegionConfirm({
        x: physX,
        y: physY,
        w: physW,
        h: physH,
        // monitor_id: empty string — Rust falls back to first monitor with a logged warning.
        // Sprint 02 known limitation: Tauri 2 API for querying the current monitor from the
        // overlay window is deferred until the @tauri-apps/api version in use exposes it reliably.
        monitor_id: "",
      });
    } catch (err) {
      console.error("capture_region_confirm failed:", err);
      await captureCancel();
    }
  };

  const x = Math.min(startPoint.x, currentPoint.x);
  const y = Math.min(startPoint.y, currentPoint.y);
  const w = Math.abs(currentPoint.x - startPoint.x);
  const h = Math.abs(currentPoint.y - startPoint.y);

  return (
    <div
      className="overlay-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="overlay-dim" />
      {isDragging && w > 0 && h > 0 && (
        <div
          className="overlay-selection"
          style={{ left: x, top: y, width: w, height: h }}
        >
          <div className="overlay-dimensions">
            {Math.round(w * (window.devicePixelRatio ?? 1))} ×{" "}
            {Math.round(h * (window.devicePixelRatio ?? 1))} px
          </div>
        </div>
      )}
    </div>
  );
}
