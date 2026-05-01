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
import { TitleBar } from "../editor/TitleBar";

export function QuickAccess() {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<EditorPreset>(DEFAULT_PRESET);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const bootstrappedAssetIdRef = useRef<string | null>(null);
  const resolvedAssetIdRef = useRef<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (assetId) {
      void quickAccessSetBusy(assetId, isActionInFlight).catch(() => {});
    }
  }, [assetId, isActionInFlight]);

  const handleDismiss = useCallback(async () => {
    const targetId = assetId;
    if (!targetId) return;
    try {
      await quickAccessDismiss(targetId);
    } catch {
      // Native window close hook handles actual destruction
    }
  }, [assetId]);

  const bootstrapAsset = useCallback(async (nextAssetId: string) => {
    if (bootstrappedAssetIdRef.current === nextAssetId) return;

    if (resolvedAssetIdRef.current && resolvedAssetIdRef.current !== nextAssetId) {
      void assetRelease(resolvedAssetIdRef.current, "quick_access_ui").catch(() => {});
      resolvedAssetIdRef.current = null;
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
      resolvedAssetIdRef.current = nextAssetId;

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

      const balancedPadding = autoBalance(img.width, img.height, DEFAULT_PRESET.ratio);
      setPreset({ ...DEFAULT_PRESET, padding: balancedPadding });
    } catch (e) {
      console.error("Bootstrap failed", e);
      bootstrappedAssetIdRef.current = null;
      if (resolvedAssetIdRef.current === nextAssetId) {
        void assetRelease(nextAssetId, "quick_access_ui").catch(() => {});
        resolvedAssetIdRef.current = null;
      }
      showToast("Capture is no longer available.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<QuickAccessShowPayload>("quick-access-show", (event) => {
      void bootstrapAsset(event.payload.asset_id);
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [bootstrapAsset]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const initialId = searchParams.get("asset_id");
    if (initialId) void bootstrapAsset(initialId);
  }, [bootstrapAsset]);

  const draw = useCallback(() => {
    if (!canvasRef.current || !image) return;
    composeToCanvas(canvasRef.current, image, preset);
  }, [image, preset]);

  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(draw);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [draw]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const dims = image ? getCompositionDimensions(image.width, image.height, preset) : { canvasW: 0, canvasH: 0 };

  return (
    <div className="xs-shell" data-tauri-drag-region>
      <TitleBar title="XenSnip Editor" onClose={handleDismiss} />
      
      {assetId && image ? (
        <div className="xs-viewport" data-tauri-drag-region>
          <canvas
            ref={canvasRef}
            width={dims.canvasW}
            height={dims.canvasH}
            className="xs-canvas"
          />
        </div>
      ) : (
        <div className="xs-viewport" data-tauri-drag-region>
          <div className="xs-loading">
            {isLoading ? "Loading capture..." : "Capture unavailable."}
          </div>
        </div>
      )}

      {assetId && image && (
        <div className="xs-dock-container">
          <QuickBar
            preset={preset}
            setPreset={setPreset}
            image={image}
            isActionInFlight={isActionInFlight}
            setIsActionInFlight={setIsActionInFlight}
            showToast={showToast}
          />
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
