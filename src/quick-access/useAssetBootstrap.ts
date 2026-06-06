import { useCallback, useRef, useState } from "react";
import {
  assetReadPng,
  assetRelease,
  assetResolve,
  perfLog,
  settingsLoad,
} from "../ipc/index";
import { DEFAULT_PRESET, EditorPreset, normalizeEditorPreset } from "../compose/preset";
import { autoBalance } from "../editor/autoBalance";
import { generateThumbnail } from "../editor/generateThumbnail";
import { ScreenshotDocument, DocumentUndoSnapshot } from "../editor/useScreenshotDocuments";
import { useAnnotationStore } from "../annotate/state/store";
import { CropBounds } from "../editor/useCropTool";
import { Settings } from "../ipc/types";

interface UseAssetBootstrapDeps {
  docsRef: React.MutableRefObject<ScreenshotDocument[]>;
  addDocument: (doc: ScreenshotDocument) => ScreenshotDocument[];
  releaseDocument: (doc: ScreenshotDocument) => void;
  patchDocument: (id: string, patch: Partial<ScreenshotDocument>) => void;
  flushActiveDocument: () => void;
  handleSwitchDocument: (id: string) => void;
  setActiveDocumentId: (id: string | null) => void;
  setImage: (img: HTMLImageElement | null) => void;
  setCropBounds: (b: CropBounds | null) => void;
  setSettings: (s: Settings) => void;
  setPreset: (p: EditorPreset) => void;
  undoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;
  redoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;
}

interface BootstrapCaptureContext {
  captureKind?: string;
}

/**
 * Pure function — resolves the EditorPreset to apply on editor open.
 * Implements bootstrap precedence (plan section 17):
 *   1. last_preset exists → use it (preserves saved presentation_mode)
 *   2. default_preset_id set + found → use that saved preset
 *   3. No preset → apply settings.default_presentation_mode + auto-balanced padding
 *   4. settings absent → fall back to DEFAULT_PRESET with auto-balanced padding
 */
export function resolveBootstrapPreset(
  settings: Settings | null,
  imgWidth: number,
  imgHeight: number,
): EditorPreset {
  const settingsDefaultMode: import('../compose/preset').PresentationMode =
    settings?.default_presentation_mode === 'studio' ? 'studio' : 'flat';

  if (settings?.last_preset) {
    return normalizeEditorPreset(settings.last_preset);
  }

  if (settings?.default_preset_id) {
    const def = settings.saved_presets.find((p) => p.id === settings.default_preset_id);
    if (def) return normalizeEditorPreset(def.preset);
  }

  return {
    ...DEFAULT_PRESET,
    presentation_mode: settingsDefaultMode,
    padding: autoBalance(imgWidth, imgHeight, DEFAULT_PRESET.ratio),
  };
}

export function useAssetBootstrap(deps: UseAssetBootstrapDeps): {
  bootstrapAsset: (assetId: string, captureContext?: BootstrapCaptureContext) => Promise<void>;
  bootstrapAssetRef: React.MutableRefObject<(assetId: string, captureContext?: BootstrapCaptureContext) => Promise<void>>;
  isLoading: boolean;
} {
  const {
    docsRef,
    addDocument,
    releaseDocument,
    patchDocument,
    flushActiveDocument,
    handleSwitchDocument,
    setActiveDocumentId,
    setImage,
    setCropBounds,
    setSettings,
    setPreset,
    undoStackRef,
    redoStackRef,
  } = deps;

  const [isLoading, setIsLoading] = useState(true);

  const bootstrapAsset = useCallback(async (nextAssetId: string, captureContext?: BootstrapCaptureContext) => {
    // Check if we already have this asset using stable docsRef
    if (docsRef.current.some((d) => d.assetId === nextAssetId)) {
      const existing = docsRef.current.find((d) => d.assetId === nextAssetId)!;
      handleSwitchDocument(existing.id);
      return;
    }

    flushActiveDocument();
    setIsLoading(true);
    let uiAssetAcquired = false;
    let bootstrapUrl: string | null = null;

    try {
      const bootstrapStart = performance.now();

      const resolveStart = performance.now();
      // Acquire ref-count for this consumer. URI is unused here;
      // image bytes are read via assetReadPng() on the IPC path.
      await assetResolve(nextAssetId, "quick_access_ui");
      uiAssetAcquired = true;
      void perfLog(`Asset resolve ref-count took ${Math.round(performance.now() - resolveStart)}ms`);

      const readStart = performance.now();
      const bytes = await assetReadPng(nextAssetId);
      void perfLog(
        `Asset read over IPC took ${Math.round(performance.now() - readStart)}ms (size: ${bytes.length})`
      );

      const decodeStart = performance.now();
      const blob = new Blob([bytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      bootstrapUrl = url;

      let img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load blob image"));
      });

      if (captureContext?.captureKind === "window" && img.naturalWidth > 4 && img.naturalHeight > 4) {
        const cropStart = performance.now();
        // Use 2px inset to safely clear DWM borders on both 100% and high-DPI displays
        const insetPx = 2;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = img.naturalWidth - insetPx * 2;
        cropCanvas.height = img.naturalHeight - insetPx * 2;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(img, -insetPx, -insetPx);
          const croppedUrl = cropCanvas.toDataURL("image/png");
          const croppedImg = new Image();
          croppedImg.src = croppedUrl;
          await new Promise((resolve) => { croppedImg.onload = resolve; });
          img = croppedImg;
        }
        void perfLog(`Window inset crop (${insetPx}px) took ${Math.round(performance.now() - cropStart)}ms`);
      }

      void perfLog(
        `Image decode took ${Math.round(performance.now() - decodeStart)}ms (${img.naturalWidth}x${img.naturalHeight})`
      );

      const newDoc: ScreenshotDocument = {
        id: crypto.randomUUID(),
        image: img,
        blobUrl: url,
        assetId: nextAssetId,
        thumbnailSrc: "", // Placeholder initially
        preset: resolveBootstrapPreset(null, img.width, img.height),
        annotation: {
          activeTool: "select",
          objects: [],
          selectedIds: [],
          editingTextId: null,
          toolbarCollapsed: false,
        },
        cropBounds: null,
        isExportChecked: true, // Default to checked for export
        undoStack: [],
        redoStack: [],
        createdAt: Date.now(),
      };

      const evicted = addDocument(newDoc);
      evicted.forEach(releaseDocument);

      // Set as active
      setImage(newDoc.image);
      setActiveDocumentId(newDoc.id);
      useAnnotationStore.getState().clearAll();
      setCropBounds(null);
      undoStackRef.current = [];
      redoStackRef.current = [];

      setIsLoading(false); // UI becomes usable here immediately after image is ready

      requestAnimationFrame(() => {
        const totalFE = Math.round(performance.now() - bootstrapStart);
        void perfLog(`[FIRST-PAINT] Editor usable after ${totalFE}ms (frontend bootstrap)`);
      });

      // Settings and Presets can be loaded asynchronously without blocking first paint
      const currentSettings = await settingsLoad().catch((error) => {
        console.error("Settings load failed during bootstrap", error);
        return null;
      });
      if (currentSettings) {
        setSettings(currentSettings);

        const bootstrapPreset = resolveBootstrapPreset(currentSettings, img.width, img.height);
        patchDocument(newDoc.id, { preset: bootstrapPreset });
        setPreset(bootstrapPreset);
      }

      // Defer thumbnail generation
      setTimeout(async () => {
        const thumbStart = performance.now();
        try {
          const thumb = await generateThumbnail(img);
          void perfLog(
            `Deferred thumbnail generation took ${Math.round(performance.now() - thumbStart)}ms`
          );
          patchDocument(newDoc.id, { thumbnailSrc: thumb });
        } catch (error) {
          console.error("Deferred thumbnail generation failed", error);
        }
      }, 0);
    } catch (e) {
      if (bootstrapUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(bootstrapUrl);
      }
      if (uiAssetAcquired) {
        void assetRelease(nextAssetId, "quick_access_ui").catch(() => {});
      }
      console.error("Bootstrap failed", e);
      // Surface error to caller; QuickAccess.tsx shows toast
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [
    docsRef,
    addDocument,
    releaseDocument,
    handleSwitchDocument,
    flushActiveDocument,
    setActiveDocumentId,
    setImage,
    setCropBounds,
    setSettings,
    setPreset,
    patchDocument,
    undoStackRef,
    redoStackRef,
  ]);

  const bootstrapAssetRef = useRef(bootstrapAsset);
  bootstrapAssetRef.current = bootstrapAsset;

  return { bootstrapAsset, bootstrapAssetRef, isLoading };
}
