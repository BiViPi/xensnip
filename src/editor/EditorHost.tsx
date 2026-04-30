import { useEffect, useRef, useState, useCallback } from "react";
import { loadImage, composeToCanvas } from "../compose/compose";
import { getCompositionDimensions } from "../compose/core";
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
          const balancedPadding = autoBalance(img.width, img.height, DEFAULT_PRESET.ratio);
          setPreset(prev => ({ ...prev, padding: balancedPadding }));

        } catch (err) {
          console.error("Failed to load asset", err);
          setError("Could not load captured screenshot.");
        }
      })();
    } else {
      setAssetId(null);
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

  const dims = image ? getCompositionDimensions(image.width, image.height, preset) : { canvasW: 0, canvasH: 0 };

  return (
    <div className="editor-shell">
      {assetId && image ? (
        <div className="editor-canvas-container">
          <canvas
            ref={canvasRef}
            width={dims.canvasW}
            height={dims.canvasH}
            className="editor-preview-canvas"
          />
        </div>
      ) : assetId === null ? (
        <EmptyState showToast={showToast} />
      ) : (
        <div className="editor-loading">Loading capture...</div>
      )}

      {assetId && image && (
        <QuickBar
          preset={preset}
          setPreset={setPreset}
          image={image}
          isActionInFlight={isActionInFlight}
          setIsActionInFlight={setIsActionInFlight}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
