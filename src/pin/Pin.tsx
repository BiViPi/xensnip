import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import { readPinBootstrapParams } from "./bootstrap";
import { assetReadPng, perfLog } from "../ipc";

declare global {
  interface Window {
    __XENSNIP_PIN_BOOTSTRAP__?: {
      pinId?: string;
      assetId?: string;
    };
  }
}

export function Pin() {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeWindow = async () => {
    try {
      await getCurrentWindow().close();
    } catch (err) {
      void perfLog(`[PIN] closeWindow failed error=${String(err)}`).catch(console.error);
      console.error("Failed to close pin window:", err);
    }
  };

  useEffect(() => {
    const fetchAssetId = async () => {
      const bootstrapAssetId = window.__XENSNIP_PIN_BOOTSTRAP__?.assetId ?? null;
      const bootstrapPinId = window.__XENSNIP_PIN_BOOTSTRAP__?.pinId ?? null;
      const { assetId: queryAssetId } = readPinBootstrapParams(window.location.search);
      void perfLog(`[PIN] Pin mount search=${window.location.search} bootstrapAsset=${bootstrapAssetId ?? "null"} bootstrapPin=${bootstrapPinId ?? "null"}`).catch(console.error);
      if (bootstrapAssetId) {
        void perfLog(`[PIN] Using init-script asset_id=${bootstrapAssetId}`).catch(console.error);
        setAssetId(bootstrapAssetId);
        return;
      }
      if (queryAssetId) {
        void perfLog(`[PIN] Using query asset_id=${queryAssetId}`).catch(console.error);
        setAssetId(queryAssetId);
        return;
      }

      try {
        const label = getCurrentWindow().label;
        void perfLog(`[PIN] Query asset missing; fallback pin_get_asset_id label=${label}`).catch(console.error);
        const asset = await invoke<string>("pin_get_asset_id", { pinId: label });
        void perfLog(`[PIN] pin_get_asset_id resolved asset_id=${asset}`).catch(console.error);
        setAssetId(asset);
      } catch (err) {
        console.error("Failed to resolve pin asset ID:", err);
        void perfLog(`[PIN] pin_get_asset_id failed error=${String(err)}`).catch(console.error);
        setError("Pinned image could not be restored.");
      }
    };

    fetchAssetId();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        void perfLog("[PIN] Escape pressed; closing window").catch(console.error);
        void closeWindow();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    void perfLog(`[PIN] render assetId=${assetId ?? "null"} error=${error ?? "null"}`).catch(console.error);
  }, [assetId, error]);

  useEffect(() => {
    if (!assetId) return;

    let revokedUrl: string | null = null;
    let cancelled = false;

    const loadPinnedImage = async () => {
      try {
        void perfLog(`[PIN] assetReadPng start assetId=${assetId}`).catch(console.error);
        const bytes = await assetReadPng(assetId);
        if (cancelled) return;
        const blob = new Blob([bytes], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        void perfLog(`[PIN] assetReadPng success assetId=${assetId} bytes=${bytes.length}`).catch(console.error);
        setImageSrc(url);
      } catch (err) {
        console.error("Failed to read pinned PNG bytes:", err);
        void perfLog(`[PIN] assetReadPng failed assetId=${assetId} error=${String(err)}`).catch(console.error);
        setError("Pinned image is no longer available.");
      }
    };

    void loadPinnedImage();

    return () => {
      cancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [assetId]);

  const showPlaceholder = (!assetId || (assetId && !imageSrc)) && !error;

  return (
    <div 
      className={`xs-pin-container ${isHovered ? "is-hovered" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="xs-pin-drag-surface" data-tauri-drag-region>
        {assetId && imageSrc ? (
          <img
            src={imageSrc ?? undefined}
            alt="Pinned content"
            className="xs-pin-image"
            onLoad={(event) => {
              const img = event.currentTarget;
              void perfLog(`[PIN] image loaded natural=${img.naturalWidth}x${img.naturalHeight} currentSrc=${img.currentSrc}`).catch(console.error);
            }}
            onError={(event) => {
              const img = event.currentTarget;
              void perfLog(`[PIN] image failed currentSrc=${img.currentSrc}`).catch(console.error);
              setError("Pinned image is no longer available.");
            }}
          />
        ) : (
          <div className={`xs-pin-status ${error ? "is-error" : ""}`}>
            <div className="xs-pin-status-title">
              {showPlaceholder ? "Loading pin..." : "Pin unavailable"}
            </div>
            {!showPlaceholder && error ? (
              <div className="xs-pin-status-body">{error}</div>
            ) : null}
          </div>
        )}
      </div>

      <div className="xs-pin-close-wrapper">
        <button
          onClick={() => {
            void perfLog("[PIN] close button clicked").catch(console.error);
            void closeWindow();
          }}
          className="xs-pin-close-btn"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
