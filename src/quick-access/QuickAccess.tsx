import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  assetResolve,
  clipboardWriteImage,
  editorOpen,
  exportSavePng,
  quickAccessDismiss,
} from "../ipc/index";
import { QuickAccessShowPayload } from "../ipc/types";
import { composeDefaultPreset, composeDefaultPresetDataUrl } from "./compose";

const AUTO_DISMISS_MS = 8000;

export function QuickAccess() {
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
    try {
      await quickAccessDismiss(targetId);
    } catch {
      // Rust close hook owns final cleanup.
    }
  }, [pauseDismissTimer]);

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
    setIsLoading(true);
    setToast(null);
    setIsActionInFlight(false);
    setPreviewUrl(null);
    setAssetUri(null);

    try {
      const result = await assetResolve(nextAssetId, "quick_access_ui");
      setAssetId(nextAssetId);
      setAssetUri(result.uri);
      setPreviewUrl(await composeDefaultPresetDataUrl(result.uri));
    } catch {
      showToast("Capture is no longer available. Please capture again.");
    } finally {
      setIsLoading(false);
      resetDismissTimer(nextAssetId);
    }
  }, [resetDismissTimer]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listen<QuickAccessShowPayload>("quick_access.show", (event) => {
      void bootstrapAsset(event.payload.asset_id);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [bootstrapAsset]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialAssetId = params.get("asset_id");
    if (initialAssetId) {
      void bootstrapAsset(initialAssetId);
    }
  }, [bootstrapAsset]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

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
      onMouseEnter={pauseDismissTimer}
      onMouseLeave={resumeDismissTimer}
    >
      <div className="qa-preview">
        {isLoading && <div className="qa-loading">Loading...</div>}
        {previewUrl && !isLoading && (
          <img src={previewUrl} alt="Captured screenshot" className="qa-preview-img" />
        )}
      </div>

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

      {toast && <div className="qa-toast">{toast}</div>}
    </div>
  );
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}
