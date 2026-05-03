import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { captureRegionConfirm, captureCancel } from "../ipc";
import "./Overlay.css";

export default function Overlay() {
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });
  const [monitorId, setMonitorId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mId = params.get("monitor") || "";
    setMonitorId(mId);

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
    void getCurrentWindow().setFocus();
    setIsDragging(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setCurrentPoint({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    // Seam clamp: clamp into monitor-local viewport
    const clampedX = Math.max(0, Math.min(e.clientX, window.innerWidth));
    const clampedY = Math.max(0, Math.min(e.clientY, window.innerHeight));

    setCurrentPoint({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const w = Math.abs(currentPoint.x - startPoint.x);
    const h = Math.abs(currentPoint.y - startPoint.y);

    const dpr = window.devicePixelRatio ?? 1;
    const physX = Math.round(x * dpr);
    const physY = Math.round(y * dpr);
    const physW = Math.round(w * dpr);
    const physH = Math.round(h * dpr);

    if (physW < 10 || physH < 10) {
      // Too small — cancel cleanly; Rust will release the session lock.
      await captureCancel();
      return;
    }

    try {
      await captureRegionConfirm({
        x: physX,
        y: physY,
        w: physW,
        h: physH,
        monitor_id: monitorId,
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
      onPointerEnter={() => {
        // Ensure Esc works on any overlay the user is interacting with
        void getCurrentWindow().setFocus();
      }}
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
