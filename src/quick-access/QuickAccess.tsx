import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  assetReadPng,
  assetResolve,
  clipboardWriteImage,
  editorOpen,
  exportSavePng,
  quickAccessDismiss,
} from "../ipc/index";
import { QuickAccessShowPayload } from "../ipc/types";
import { composeDefaultPreset } from "./compose";

const AUTO_DISMISS_MS = 8000;

export function QuickAccess() {
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get("mode") === "editor" ? "editor" : "quick-access";
  const [assetId, setAssetId] = useState<string | null>(null);
  const [assetUri, setAssetUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assetIdRef = useRef<string | null>(null);
  const assetUriRef = useRef<string | null>(null);
  const isActionInFlightRef = useRef(false);
  const bootstrappedAssetIdRef = useRef<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    assetIdRef.current = assetId;
  }, [assetId]);

  useEffect(() => {
    assetUriRef.current = assetUri;
  }, [assetUri]);

  useEffect(() => {
    isActionInFlightRef.current = isActionInFlight;
  }, [isActionInFlight]);

  const pauseDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
  }, []);

  const handleDismiss = useCallback(async (id?: string) => {
    const targetId = id ?? assetIdRef.current;
    if (!targetId) return;
    pauseDismissTimer();
    if (mode === "editor") {
      window.close();
      return;
    }
    try {
      await quickAccessDismiss(targetId);
    } catch {
      // Rust close hook owns final cleanup.
    }
  }, [mode, pauseDismissTimer]);

  const resetDismissTimer = useCallback((id: string) => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      if (!isActionInFlightRef.current) {
        void handleDismiss(id);
      }
    }, AUTO_DISMISS_MS);
  }, [handleDismiss]);

  const resumeDismissTimer = useCallback(() => {
    if (assetIdRef.current && !isActionInFlightRef.current) {
      resetDismissTimer(assetIdRef.current);
    }
  }, [resetDismissTimer]);

  const bootstrapAsset = useCallback(async (nextAssetId: string) => {
    if (bootstrappedAssetIdRef.current === nextAssetId) {
      return;
    }
    bootstrappedAssetIdRef.current = nextAssetId;
    setIsLoading(true);
    setToast(null);
    setIsActionInFlight(false);
    setPreviewUrl(null);
    setAssetUri(null);

    try {
      if (mode === "quick-access") {
        await assetResolve(nextAssetId, "quick_access_ui");
      }
      const pngBytes = await assetReadPng(nextAssetId);
      const objectUrl = URL.createObjectURL(new Blob([pngBytes], { type: "image/png" }));
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
      previewObjectUrlRef.current = objectUrl;
      setAssetId(nextAssetId);
      setAssetUri(objectUrl);
      setPreviewUrl(objectUrl);
    } catch {
      bootstrappedAssetIdRef.current = null;
      showToast("Capture is no longer available. Please capture again.");
    } finally {
      setIsLoading(false);
      if (mode === "quick-access") {
        resetDismissTimer(nextAssetId);
      }
    }
  }, [mode, resetDismissTimer]);

  useEffect(() => {
    if (mode === "editor") {
      return;
    }

    let unlisten: (() => void) | null = null;

    listen<QuickAccessShowPayload>("quick_access.show", (event) => {
      void bootstrapAsset(event.payload.asset_id);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [bootstrapAsset, mode]);

  useEffect(() => {
    const initialAssetId = searchParams.get("asset_id");
    if (initialAssetId) {
      void bootstrapAsset(initialAssetId);
    }
  }, [bootstrapAsset]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, [mode]);

  async function withFlight<T>(fn: () => Promise<T>): Promise<T | null> {
    if (isActionInFlightRef.current || !assetIdRef.current || !assetUriRef.current) {
      return null;
    }
    setIsActionInFlight(true);
    pauseDismissTimer();
    try {
      return await fn();
    } finally {
      setIsActionInFlight(false);
      resumeDismissTimer();
    }
  }

  async function handleCopy() {
    await withFlight(async () => {
      const id = assetIdRef.current!;
      const uri = assetUriRef.current!;
      try {
        const blob = await composeDefaultPreset(uri);
        await clipboardWriteImage(await blobToBytes(blob));
        showToast("Copied!");
        setTimeout(() => {
          void handleDismiss(id);
        }, 1200);
      } catch {
        showToast("Could not copy. Please try again.");
      }
    });
  }

  async function handleExport() {
    await withFlight(async () => {
      const uri = assetUriRef.current!;
      try {
        const blob = await composeDefaultPreset(uri);
        const now = new Date();
        const ts = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, "0"),
          String(now.getDate()).padStart(2, "0"),
          "-",
          String(now.getHours()).padStart(2, "0"),
          String(now.getMinutes()).padStart(2, "0"),
          String(now.getSeconds()).padStart(2, "0"),
        ].join("");
        const saved = await exportSavePng(await blobToBytes(blob), `xensnip-${ts}.png`);
        if (saved) {
          showToast("Saved!");
        } else {
          showToast("Save canceled.");
        }
      } catch {
        showToast("Could not save the file. Please try again.");
      }
    });
  }

  async function handleOpenEditor() {
    await withFlight(async () => {
      const id = assetIdRef.current!;
      try {
        await editorOpen(id);
        await handleDismiss(id);
      } catch {
        showToast("Could not open editor. Please try again.");
      }
    });
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div
      className="qa-container"
      onMouseEnter={mode === "quick-access" ? pauseDismissTimer : undefined}
      onMouseLeave={mode === "quick-access" ? resumeDismissTimer : undefined}
    >
      <div className="qa-preview">
        {isLoading && <div className="qa-loading">Loading...</div>}
        {!isLoading && !previewUrl && (
          <div className="qa-loading">Preview unavailable.</div>
        )}
        {previewUrl && !isLoading && (
          <img
            src={previewUrl}
            alt="Captured screenshot"
            className="qa-preview-img"
            onError={() => {
              setPreviewUrl(null);
              showToast("Could not load preview image.");
            }}
          />
        )}
      </div>

      {mode === "quick-access" ? (
        <div className="qa-actions">
          <button
            className="qa-btn qa-btn-primary"
            onClick={handleCopy}
            disabled={isActionInFlight || isLoading}
          >
            Copy
          </button>
          <button
            className="qa-btn"
            onClick={handleExport}
            disabled={isActionInFlight || isLoading}
          >
            Export
          </button>
          <button
            className="qa-btn"
            onClick={handleOpenEditor}
            disabled={isActionInFlight || isLoading}
          >
            Open Editor
          </button>
          <button
            className="qa-btn qa-btn-dismiss"
            onClick={() => void handleDismiss()}
            disabled={isActionInFlight}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="qa-editor-footer">Editor preview only. Full tools arrive in Sprint 04.</div>
      )}

      {toast && <div className="qa-toast">{toast}</div>}
    </div>
  );
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}
