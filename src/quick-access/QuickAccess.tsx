import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  assetReadPng,
  clipboardWriteImage,
  editorOpen,
  exportSavePng,
  quickAccessDismiss,
} from "../ipc/index";
import { EditorHandoffResult, EditorOpenError, QuickAccessShowPayload } from "../ipc/types";
import { composeToBlob, loadImage } from "../compose/compose";
import { DEFAULT_PRESET } from "../compose/preset";

const AUTO_DISMISS_MS = 8000;

function probe(stage: string) {
  const root = document.getElementById("root");
  void invoke("debug_webview_probe", {
    label: "quick-access",
    stage,
    href: window.location.href,
    rootChildren: root?.childElementCount ?? -1,
    scripts: document.scripts.length,
  }).catch(() => {});
}

export function QuickAccess() {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [assetUri, setAssetUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [handoffPending, setHandoffPending] = useState(false);
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
    probe(`bootstrap_start:${nextAssetId}`);
    if (bootstrappedAssetIdRef.current === nextAssetId) {
      probe(`bootstrap_skip_duplicate:${nextAssetId}`);
      return;
    }
    bootstrappedAssetIdRef.current = nextAssetId;
    setIsLoading(true);
    setToast(null);
    setIsActionInFlight(false);
    setHandoffPending(false);
    setPreviewUrl(null);
    setAssetUri(null);

    try {
      const pngBytes = await assetReadPng(nextAssetId);
      probe(`bootstrap_asset_read_ok:${nextAssetId}:${pngBytes.length}`);
      const assetUri = URL.createObjectURL(
        new Blob([pngBytes], { type: "image/png" }),
      );

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
      previewObjectUrlRef.current = assetUri;
      setAssetId(nextAssetId);
      setAssetUri(assetUri);
      setPreviewUrl(assetUri);
      probe(`bootstrap_success:${nextAssetId}`);
    } catch (e) {
      console.error("Bootstrap failed", e);
      bootstrappedAssetIdRef.current = null;
      probe(`bootstrap_error:${nextAssetId}`);
      showToast("Capture is no longer available. Please capture again.");
    } finally {
      setIsLoading(false);
      resetDismissTimer(nextAssetId);
      probe(`bootstrap_finally:${nextAssetId}`);
    }
  }, [resetDismissTimer]);

  useEffect(() => {
    probe("component_mounted");
    let unlisten: (() => void) | null = null;

    listen<QuickAccessShowPayload>("quick-access-show", (event) => {
      probe(`event_quick_access_show:${event.payload.asset_id}`);
      void bootstrapAsset(event.payload.asset_id);
    }).then((fn) => {
      unlisten = fn;
      probe("listen_registered");
    }).catch(() => {
      probe("listen_register_error");
    });

    return () => {
      unlisten?.();
    };
  }, [bootstrapAsset]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const initialAssetId = searchParams.get("asset_id");
    probe(`search_params_asset:${initialAssetId ?? "none"}`);
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
  }, []);

  async function withFlight<T>(fn: () => Promise<T>): Promise<T | null> {
    if (isActionInFlightRef.current || handoffPending || !assetIdRef.current || !assetUriRef.current) {
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
        const img = await loadImage(uri);
        const blobBytes = await composeToBlob(img, DEFAULT_PRESET);
        await clipboardWriteImage(blobBytes);
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
        const img = await loadImage(uri);
        const blobBytes = await composeToBlob(img, DEFAULT_PRESET);
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
        const saved = await exportSavePng(blobBytes, `xensnip-${ts}.png`);
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
    if (handoffPending || isActionInFlight || !assetIdRef.current) return;

    const id = assetIdRef.current;
    setHandoffPending(true);
    pauseDismissTimer();

    let unlistenHandoff: (() => void) | null = null;

    try {
      // FIX High: Register listener BEFORE calling editorOpen to avoid race
      const promise = listen<EditorHandoffResult>("editor-handoff-result", (event) => {
        if (event.payload.status === "succeeded") {
          void handleDismiss(id);
        } else {
          setHandoffPending(false);
          resumeDismissTimer();
          showToast("Editor took too long to open. Please try again.");
        }
        unlistenHandoff?.();
      });
      
      unlistenHandoff = await promise;

      await editorOpen(id);
    } catch (err: any) {
      unlistenHandoff?.();
      setHandoffPending(false);
      resumeDismissTimer();

      const error = err as EditorOpenError;
      if (error.code === "SoftLimitReached") {
        showToast("Editor limit reached. Showing the most recent editor.");
      } else if (error.code === "AssetMissing") {
        showToast("Capture is no longer available. Please capture again.");
        void handleDismiss(id);
      } else {
        showToast("Could not open the editor. Please try again.");
      }
    }
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

      <div className="qa-actions">
        <button
          className="qa-btn qa-btn-primary"
          onClick={handleCopy}
          disabled={isActionInFlight || handoffPending || isLoading}
        >
          Copy
        </button>
        <button
          className="qa-btn"
          onClick={handleExport}
          disabled={isActionInFlight || handoffPending || isLoading}
        >
          Export
        </button>
        <button
          className="qa-btn"
          onClick={handleOpenEditor}
          disabled={isActionInFlight || handoffPending || isLoading}
        >
          {handoffPending ? "Opening..." : "Open Editor"}
        </button>
        <button
          className="qa-btn qa-btn-dismiss"
          onClick={() => void handleDismiss()}
          disabled={isActionInFlight || handoffPending}
        >
          Dismiss
        </button>
      </div>

      {toast && <div className="qa-toast">{toast}</div>}
    </div>
  );
}
