import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import {
  assetRelease,
  quickAccessMarkReady,
  settingsLoad,
} from "../ipc/index";
import { QuickAccessShowPayload, Settings, ThemeMode } from "../ipc/types";
import { applyTheme } from "../styles/applyTheme";
import { DEFAULT_PRESET, EditorPreset } from "../compose/preset";
import { preloadWallpaper, getOrLoadWallpaper } from "../compose/core";
import { Toast } from "../editor/Toast";
import { TitleBar } from "../editor/TitleBar";
import { PresetManager } from "../editor/controls/PresetManager";
import { RightSidebar } from "../sidebar/RightSidebar";
import { usePreviewMetrics } from "../editor/usePreviewMetrics";
import { useAnnotationStore } from "../annotate/state/store";
import { useKeyboardShortcuts } from "../editor/useKeyboardShortcuts";
import { useCropTool } from "../editor/useCropTool";
import { registerHistoryRecorder } from "../editor/historyBridge";
import { useScreenshotDocuments, ScreenshotDocument } from "../editor/useScreenshotDocuments";
import { generateThumbnail } from "../editor/generateThumbnail";
import { useEditorUndoStack } from "../editor/useEditorUndoStack";
import { useAssetBootstrap } from "./useAssetBootstrap";
import { useQuickAccessSessionController } from "./useQuickAccessSessionController";
import { QuickAccessViewport } from "./QuickAccessViewport";
import { QuickAccessDock } from "./QuickAccessDock";
import "./QuickAccess.css";

const LEFT_PANEL_MIN_WIDTH = 220;
const LEFT_PANEL_MAX_WIDTH = 272;
const LEFT_PANEL_COLLAPSED_WIDTH = 52;
const LEFT_PANEL_OFFSET = 20;
const LEFT_PANEL_SAFE_GAP = 16;

export function QuickAccess() {
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<EditorPreset>(DEFAULT_PRESET);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [wallpaperFlip, setWallpaperFlip] = useState(0);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
  const [activePop, setActivePop] = useState<string | null>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialAssetHandledRef = useRef(false);

  // ── 1. Document list ────────────────────────────────────────────────────
  const {
    documents,
    activeDocumentId,
    activeDoc,
    addDocument,
    removeDocument,
    switchToDocument,
    updateCheckbox,
    patchActiveDocument,
    patchDocument,
    clearAll,
    setActiveDocumentId,
    docsRef,
    activeIdRef,
  } = useScreenshotDocuments();

  // Shell-owned: mixes blob URL cleanup + IPC asset release
  const releaseDocument = useCallback((doc: ScreenshotDocument) => {
    URL.revokeObjectURL(doc.blobUrl);
    if (doc.assetId) {
      void assetRelease(doc.assetId, "quick_access_ui").catch(() => {});
    }
  }, []);

  // ── 2. Crop tool ────────────────────────────────────────────────────────
  const { activeTool, setActiveTool } = useAnnotationStore();
  const {
    cropBounds,
    setCropBounds,
    startCrop,
    cancelCrop,
    commitCrop,
    hasAnnotations,
  } = useCropTool(image, preset, setImage, setActiveTool, async (newImg) => {
    if (activeDocumentId) {
      const thumb = await generateThumbnail(newImg);
      patchActiveDocument({ image: newImg, blobUrl: newImg.src, thumbnailSrc: thumb });
    }
  });

  // ── 3. Undo stack ───────────────────────────────────────────────────────
  const { pushHistorySnapshot, handleUndo, undoStackRef } = useEditorUndoStack({
    image,
    cropBounds,
    setImage,
    setCropBounds,
  });

  // ── 4. Session controller ───────────────────────────────────────────────
  const { flushActiveDocument, handleSwitchDocument, handleDeleteDocument, handleClearAllInSession } =
    useQuickAccessSessionController({
      documents,
      docsRef,
      activeIdRef,
      switchToDocument,
      removeDocument,
      patchDocument,
      image,
      cropBounds,
      setImage,
      setCropBounds,
      undoStackRef,
      activeTool,
      cancelCrop,
      releaseDocument,
    });

  // ── 5. Asset bootstrap ──────────────────────────────────────────────────
  const { bootstrapAssetRef, isLoading } = useAssetBootstrap({
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
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────

  useEffect(() => {
    settingsLoad().then((s) => {
      setSettings(s);
      applyTheme(s.theme);
    }).catch(console.error);

    const unlisten = listen<ThemeMode>("theme-changed", (event) => {
      applyTheme(event.payload);
    });
    const handleResize = () =>
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      unlisten.then((fn) => fn());
    };
  }, []);

  const refreshSettings = useCallback(() => {
    settingsLoad().then((s) => {
      setSettings(s);
      applyTheme(s.theme);
    }).catch(console.error);
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useKeyboardShortcuts({ onUndo: () => void handleUndo() });

  useEffect(() => {
    registerHistoryRecorder(pushHistorySnapshot);
    return () => registerHistoryRecorder(null);
  }, [pushHistorySnapshot]);

  useEffect(() => {
    if (activeTool === "crop" && !cropBounds) startCrop();
  }, [activeTool, cropBounds, startCrop]);

  useEffect(() => {
    let mounted = true;
    let unlisten: null | (() => void) = null;
    void listen<QuickAccessShowPayload>("quick-access-show", (event) => {
      refreshSettings();
      void (async () => {
        try {
          setToast(null);
          setIsActionInFlight(false);
          await bootstrapAssetRef.current(event.payload.asset_id);
        } catch {
          showToast("Capture is no longer available.", "error");
        }
      })();
    }).then((fn) => {
      if (mounted) {
        unlisten = fn;
        void quickAccessMarkReady().catch(console.error);
      } else {
        fn();
      }
    });
    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [refreshSettings, bootstrapAssetRef, showToast]);

  useEffect(() => {
    if (initialAssetHandledRef.current) return;
    const initialId = new URLSearchParams(window.location.search).get("asset_id");
    if (initialId) {
      initialAssetHandledRef.current = true;
      void (async () => {
        try {
          await bootstrapAssetRef.current(initialId);
        } catch {
          showToast("Capture is no longer available.", "error");
        }
      })();
    }
  }, [bootstrapAssetRef, showToast]);

  useEffect(() => {
    if (preset.bg_mode === "Wallpaper") {
      if (getOrLoadWallpaper(preset.bg_value)) return;
      preloadWallpaper(preset.bg_value)
        .then(() => setWallpaperFlip((v) => v + 1))
        .catch(console.error);
    }
  }, [preset.bg_mode, preset.bg_value]);

  const handleDismiss = useCallback(async () => {
    const allDocs = clearAll();
    allDocs.forEach(releaseDocument);
    await getCurrentWindow().close();
  }, [clearAll, releaseDocument]);

  // ── Layout metrics ──────────────────────────────────────────────────────

  const expandedPanelWidth = Math.min(
    LEFT_PANEL_MAX_WIDTH,
    Math.max(LEFT_PANEL_MIN_WIDTH, Math.round(viewportSize.width * 0.2))
  );
  const leftPanelWidth = isLeftPanelCollapsed
    ? LEFT_PANEL_COLLAPSED_WIDTH
    : expandedPanelWidth;
  const leftPanelReserve = leftPanelWidth + LEFT_PANEL_OFFSET + LEFT_PANEL_SAFE_GAP;

  const {
    dims,
    previewScale,
    previewRenderScale,
    previewW,
    previewH,
    centerX,
    centerY,
    previewCenterOffsetX,
    previewViewportCenterOffsetX,
    layout,
  } = usePreviewMetrics(image, preset, viewportSize, leftPanelReserve);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="xs-shell">
      <TitleBar title="Xensnip" onClose={handleDismiss} />
      <div className="xs-editor-glow" />

      <QuickAccessViewport
        documents={documents}
        activeDocumentId={activeDocumentId}
        activeDoc={activeDoc}
        image={image}
        isLoading={isLoading}
        isLeftPanelCollapsed={isLeftPanelCollapsed}
        expandedPanelWidth={expandedPanelWidth}
        layout={layout}
        dims={dims}
        previewW={previewW}
        previewH={previewH}
        previewScale={previewScale}
        previewRenderScale={previewRenderScale}
        previewCenterOffsetX={previewCenterOffsetX}
        centerX={centerX}
        centerY={centerY}
        preset={preset}
        activeTool={activeTool}
        activePop={activePop}
        cropBounds={cropBounds}
        hasAnnotations={hasAnnotations}
        wallpaperFlip={wallpaperFlip}
        canvasRef={canvasRef}
        stageRef={stageRef}
        onCollapsedChange={setIsLeftPanelCollapsed}
        onSelectDocument={handleSwitchDocument}
        onToggleCheckbox={(id) => {
          const doc = docsRef.current.find((d) => d.id === id);
          if (doc) updateCheckbox(id, !doc.isExportChecked);
        }}
        onDeleteDocument={handleDeleteDocument}
        onPresetChange={setPreset}
        onCropBoundsChange={setCropBounds}
        onCommitCrop={commitCrop}
        onCancelCrop={cancelCrop}
      />

      <QuickAccessDock
        activeDoc={activeDoc}
        image={image}
        documents={documents}
        preset={preset}
        settings={settings}
        activePop={activePop}
        isActionInFlight={isActionInFlight}
        previewViewportCenterOffsetX={previewViewportCenterOffsetX}
        onPresetChange={setPreset}
        onActionInFlightChange={setIsActionInFlight}
        onShowToast={showToast}
        onActivePopChange={setActivePop}
        onRefreshSettings={refreshSettings}
        onOpenPresetManager={() => setIsPresetManagerOpen(true)}
        onClearAllSession={handleClearAllInSession}
        onFlush={flushActiveDocument}
      />

      {isPresetManagerOpen && (
        <PresetManager
          settings={settings}
          onRefresh={refreshSettings}
          onClose={() => setIsPresetManagerOpen(false)}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
      <RightSidebar />
    </div>
  );
}
