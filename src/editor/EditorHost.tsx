import { useEffect, useRef, useState, useCallback } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { loadImage, composeToCanvas } from "../compose/compose";
import { DEFAULT_PRESET, EditorPreset } from "../compose/preset";
import { autoBalance } from "./autoBalance";
import { QuickBar } from "./QuickBar";
import { EmptyState } from "./EmptyState";
import { Toast } from "./Toast";

export function EditorHost() {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<EditorPreset>(DEFAULT_PRESET);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("asset_id");
    if (id) {
      setAssetId(id);
      void (async () => {
        try {
          const assetUri = `xensnip-asset://localhost/${id}`;
          const img = await loadImage(assetUri);
          setImage(img);
          
          // Initial auto-balance
          if (containerRef.current) {
            const { clientWidth: cw, clientHeight: ch } = containerRef.current;
            const balancedPadding = autoBalance(img.width, img.height, DEFAULT_PRESET.ratio, cw, ch);
            setPreset(prev => ({ ...prev, padding: balancedPadding }));
          }

          // Emit editor.ready
          const label = getCurrentWebviewWindow().label;
          await emit("editor.ready", { window_label: label });
        } catch (err) {
          console.error("Failed to load asset", err);
          setError("Could not load captured screenshot.");
        }
      })();
    } else {
      // Empty state
      setAssetId(null);
      // Still emit ready for empty editor if needed, but registry doesn't track handoff for empty.
      const label = getCurrentWebviewWindow().label;
      emit("editor.ready", { window_label: label }).ok;
    }
  }, []);

  const draw = useCallback(() => {
    if (!canvasRef.current || !image) return;
    composeToCanvas(canvasRef.current, image, preset);
  }, [image, preset]);

  useEffect(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [draw]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (error) {
    return <div className="editor-error">{error}</div>;
  }

  if (!assetId && assetId !== null) {
    return <div className="editor-loading">Loading...</div>;
  }

  return (
    <div className="editor-shell" ref={containerRef}>
      {assetId && image ? (
        <div className="editor-canvas-container">
          <canvas
            ref={canvasRef}
            width={image.width + preset.padding * 2}
            height={image.height + preset.padding * 2}
            className="editor-preview-canvas"
          />
        </div>
      ) : assetId === null ? (
        <EmptyState />
      ) : (
        <div className="editor-loading">Loading capture...</div>
      )}

      {assetId && image && (
        <QuickBar
          preset={preset}
          setPreset={setPreset}
          image={image}
          assetId={assetId}
          isActionInFlight={isActionInFlight}
          setIsActionInFlight={setIsActionInFlight}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
