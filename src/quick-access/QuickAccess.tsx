import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  quickAccessDismiss,
  assetReadPng,
  assetRelease,
  assetResolve,
  quickAccessSetBusy,
} from "../ipc/index";
import { QuickAccessShowPayload } from "../ipc/types";
import { composeToCanvas } from "../compose/compose";
import { DEFAULT_PRESET, EditorPreset } from "../compose/preset";
import { getCompositionDimensions } from "../compose/core";
import { autoBalance } from "../editor/autoBalance";
import { QuickBar } from "../editor/QuickBar";
import { Toast } from "../editor/Toast";

export function QuickAccess() {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<EditorPreset>(DEFAULT_PRESET);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const assetIdRef = useRef<string | null>(null);
  const bootstrappedAssetIdRef = useRef<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    assetIdRef.current = assetId;
  }, [assetId]);

  useEffect(() => {
    if (assetId) {
      void quickAccessSetBusy(assetId, isActionInFlight);
    }
    return () => {
      // Ensure we clear busy state if unmounting
      if (assetId) {
        void quickAccessSetBusy(assetId, false);
      }
    };
  }, [assetId, isActionInFlight]);

  const handleDismiss = useCallback(async (id?: string) => {
    const targetId = id ?? assetIdRef.current;
    if (!targetId) return;
    
    try {
      await quickAccessDismiss(targetId);
    } catch {
      // Rust close hook owns final cleanup.
    }
  }, []);

  const bootstrapAsset = useCallback(async (nextAssetId: string) => {
    let uiAssetResolved = false;

    if (bootstrappedAssetIdRef.current === nextAssetId) {
      return;
    }
    bootstrappedAssetIdRef.current = nextAssetId;
    setIsLoading(true);
    setToast(null);
    setIsActionInFlight(false);
    setImage(null);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    try {
      await assetResolve(nextAssetId, "quick_access_ui");
      uiAssetResolved = true;

      const bytes = await assetReadPng(nextAssetId);
      const blob = new Blob([bytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load blob image"));
      });

      setImage(img);
      setAssetId(nextAssetId);

      // Initial auto-balance
      const balancedPadding = autoBalance(img.width, img.height, DEFAULT_PRESET.ratio);
      setPreset({ ...DEFAULT_PRESET, padding: balancedPadding });
    } catch (e) {
      console.error("Bootstrap failed", e);
      bootstrappedAssetIdRef.current = null;
      if (uiAssetResolved) {
        void assetRelease(nextAssetId, "quick_access_ui");
      }
      showToast("Capture is no longer available. Please capture again.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listen<QuickAccessShowPayload>("quick-access-show", (event) => {
      void bootstrapAsset(event.payload.asset_id);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [bootstrapAsset]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const initialAssetId = searchParams.get("asset_id");
    if (initialAssetId) {
      void bootstrapAsset(initialAssetId);
    }
  }, [bootstrapAsset]);

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

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const dims = image ? getCompositionDimensions(image.width, image.height, preset) : { canvasW: 0, canvasH: 0 };

  return (
    <div className="editor-shell qa-pivot-shell">
      {assetId && image ? (
        <div className="editor-canvas-container">
          <canvas
            ref={canvasRef}
            width={dims.canvasW}
            height={dims.canvasH}
            className="editor-preview-canvas"
          />
        </div>
      ) : (
        <div className="editor-loading">
          {isLoading ? "Loading capture..." : "Capture unavailable."}
        </div>
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

      <button className="qa-pivot-dismiss" onClick={() => void handleDismiss()}>
        Dismiss
      </button>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
