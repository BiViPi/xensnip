import { useCallback, useRef, useState } from "react";
import {
  assetReadPng,
  assetResolve,
  perfLog,
  settingsLoad,
} from "../ipc/index";
import { DEFAULT_PRESET, EditorPreset } from "../compose/preset";
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
  handleSwitchDocument: (id: string) => void;
  setActiveDocumentId: (id: string | null) => void;
  setImage: (img: HTMLImageElement | null) => void;
  setCropBounds: (b: CropBounds | null) => void;
  setSettings: (s: Settings) => void;
  setPreset: (p: EditorPreset) => void;
  undoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;
  redoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;
}

export function useAssetBootstrap(deps: UseAssetBootstrapDeps): {
  bootstrapAsset: (assetId: string) => Promise<void>;
  bootstrapAssetRef: React.MutableRefObject<(assetId: string) => Promise<void>>;
  isLoading: boolean;
} {
  const {
    docsRef,
    addDocument,
    releaseDocument,
    patchDocument,
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

  const bootstrapAsset = useCallback(async (nextAssetId: string) => {
    // Check if we already have this asset using stable docsRef
    if (docsRef.current.some((d) => d.assetId === nextAssetId)) {
      const existing = docsRef.current.find((d) => d.assetId === nextAssetId)!;
      handleSwitchDocument(existing.id);
      return;
    }

    setIsLoading(true);

    try {
      const bootstrapStart = performance.now();

      const resolveStart = performance.now();
      // Acquire ref-count for this consumer. URI is unused here;
      // image bytes are read via assetReadPng() on the IPC path.
      await assetResolve(nextAssetId, "quick_access_ui");
      void perfLog(`Asset resolve ref-count took ${Math.round(performance.now() - resolveStart)}ms`);

      const readStart = performance.now();
      const bytes = await assetReadPng(nextAssetId);
      void perfLog(
        `Asset read over IPC took ${Math.round(performance.now() - readStart)}ms (size: ${bytes.length})`
      );

      const decodeStart = performance.now();
      const blob = new Blob([bytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load blob image"));
      });
      void perfLog(
        `Image decode took ${Math.round(performance.now() - decodeStart)}ms (${img.naturalWidth}x${img.naturalHeight})`
      );

      const newDoc: ScreenshotDocument = {
        id: crypto.randomUUID(),
        image: img,
        blobUrl: url,
        assetId: nextAssetId,
        thumbnailSrc: "", // Placeholder initially
        annotation: {
          activeTool: "select",
          objects: [],
          selectedId: null,
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
      const currentSettings = await settingsLoad();
      setSettings(currentSettings);

      // Shared preset logic (applies to all captures in session)
      if (currentSettings?.last_preset) {
        setPreset({ ...DEFAULT_PRESET, ...currentSettings.last_preset });
      } else if (currentSettings?.default_preset_id) {
        const def = currentSettings.saved_presets.find(
          (p) => p.id === currentSettings.default_preset_id
        );
        if (def) setPreset({ ...DEFAULT_PRESET, ...def.preset });
        else
          setPreset({
            ...DEFAULT_PRESET,
            padding: autoBalance(img.width, img.height, DEFAULT_PRESET.ratio),
          });
      } else {
        setPreset({
          ...DEFAULT_PRESET,
          padding: autoBalance(img.width, img.height, DEFAULT_PRESET.ratio),
        });
      }

      // Defer thumbnail generation
      setTimeout(async () => {
        const thumbStart = performance.now();
        const thumb = await generateThumbnail(img);
        void perfLog(
          `Deferred thumbnail generation took ${Math.round(performance.now() - thumbStart)}ms`
        );
        patchDocument(newDoc.id, { thumbnailSrc: thumb });
      }, 0);
    } catch (e) {
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
