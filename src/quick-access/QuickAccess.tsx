import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  assetRelease,
  quickAccessMarkReady,
  settingsLoad,
} from "../ipc/index";
import { QuickAccessShowPayload, Settings, ThemeMode } from "../ipc/types";
import { applyTheme } from "../styles/applyTheme";
import { composeToCanvas } from "../compose/compose";
import { DEFAULT_PRESET, EditorPreset } from "../compose/preset";
import { preloadWallpaper, getOrLoadWallpaper } from "../compose/core";
import { QuickBar } from "../editor/QuickBar";
import { Toast } from "../editor/Toast";
import { TitleBar } from "../editor/TitleBar";
import { PresetManager } from "../editor/controls/PresetManager";
import { RightSidebar } from "../sidebar/RightSidebar";
import { usePreviewMetrics } from "../editor/usePreviewMetrics";
import { AnnotationStage } from "../annotate/AnnotationStage";
import { useKeyboardShortcuts } from "../editor/useKeyboardShortcuts";
import { FloatingToolbarManager } from "../annotate/floating/FloatingToolbarManager";
import { useAnnotationStore } from "../annotate/state/store";
import { useCropTool } from "../editor/useCropTool";
import { CropOverlay } from "../editor/CropOverlay";
import { registerHistoryRecorder } from "../editor/historyBridge";
import { useScreenshotDocuments, ScreenshotDocument, DocumentStateSnapshot } from "../editor/useScreenshotDocuments";
import { generateThumbnail } from "../editor/generateThumbnail";
import { LeftPanel } from "../left-panel/LeftPanel";
import { ShadowDotOverlay } from "../editor/ShadowDotOverlay";
import { useEditorUndoStack } from "../editor/useEditorUndoStack";
import { useAssetBootstrap } from "./useAssetBootstrap";
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
  const stageRef = useRef<any>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const initialAssetHandledRef = useRef(false);

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
    activeIdRef
  } = useScreenshotDocuments();

  // Cleanup helper for assets and blob URLs
  const releaseDocument = useCallback((doc: ScreenshotDocument) => {
    URL.revokeObjectURL(doc.blobUrl);
    if (doc.assetId) {
      void assetRelease(doc.assetId, "quick_access_ui").catch(() => {});
    }
  }, []);

  useEffect(() => {
    settingsLoad().then(s => {
      setSettings(s);
      applyTheme(s.theme);
    }).catch(console.error);

    const unlisten = listen<ThemeMode>("theme-changed", (event) => {
      applyTheme(event.payload);
    });
    
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      unlisten.then(fn => fn());
    };
  }, []);

  const refreshSettings = useCallback(() => {
    settingsLoad().then((s) => {
      setSettings(s);
      applyTheme(s.theme);
    }).catch(console.error);
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const { activeTool, setActiveTool } = useAnnotationStore();
  const { 
    cropBounds, 
    setCropBounds, 
    startCrop, 
    cancelCrop, 
    commitCrop,
    hasAnnotations
  } = useCropTool(image, preset, setImage, setActiveTool, async (newImg) => {
    // Persist to document list
    if (activeDocumentId) {
      const thumb = await generateThumbnail(newImg);
      patchActiveDocument({ 
        image: newImg, 
        blobUrl: newImg.src,
        thumbnailSrc: thumb
      });
    }
  });

  const { pushHistorySnapshot, handleUndo, undoStackRef } = useEditorUndoStack({
    image,
    cropBounds,
    setImage,
    setCropBounds,
  });

  const flushActiveDocument = useCallback(() => {
    if (!activeDocumentId) return;
    const s = useAnnotationStore.getState();
    const snap = {
      annotation: {
        activeTool: s.activeTool,
        objects: s.objects.map(obj => ({ ...obj })),
        selectedId: s.selectedId,
        editingTextId: s.editingTextId,
        toolbarCollapsed: s.toolbarCollapsed,
      },
      cropBounds: cropBounds ? { ...cropBounds } : null,
      undoStack: [...undoStackRef.current],
      image: image || undefined
    };
    switchToDocument(activeDocumentId, snap);
  }, [activeDocumentId, cropBounds, image, switchToDocument, undoStackRef]);

  const handleSwitchDocument = useCallback((nextId: string) => {
    const activeId = activeIdRef.current;
    if (nextId === activeId) return;

    // 1. Cancel active crop if running
    if (activeTool === 'crop') cancelCrop();

    // 2. Build current state snapshot
    const annotationState = useAnnotationStore.getState();
    const snapshot: DocumentStateSnapshot = {
      annotation: {
        activeTool: annotationState.activeTool,
        objects: annotationState.objects.map((obj) => ({ ...obj })),
        selectedId: annotationState.selectedId,
        editingTextId: annotationState.editingTextId,
        toolbarCollapsed: annotationState.toolbarCollapsed,
      },
      cropBounds: cropBounds ?? null,
      undoStack: [...undoStackRef.current],
      image: image ?? undefined,
    };

    // 3. Persist into current doc + set activeDocumentId atomically
    switchToDocument(nextId, snapshot);

    // 4. Restore incoming doc into editor shell
    const nextDoc = docsRef.current.find(d => d.id === nextId);
    if (!nextDoc) return;
    setImage(nextDoc.image);
    useAnnotationStore.getState().restoreSnapshot(nextDoc.annotation);
    setCropBounds(nextDoc.cropBounds);
    undoStackRef.current = [...nextDoc.undoStack];
  }, [activeTool, cancelCrop, cropBounds, switchToDocument, setCropBounds, docsRef, activeIdRef]);

  useKeyboardShortcuts({ onUndo: () => void handleUndo() });

  useEffect(() => {
    registerHistoryRecorder(pushHistorySnapshot);
    return () => registerHistoryRecorder(null);
  }, [pushHistorySnapshot]);

  useEffect(() => {
    if (activeTool === 'crop' && !cropBounds) {
      startCrop();
    }
  }, [activeTool, cropBounds, startCrop]);

  const { bootstrapAsset, isLoading } = useAssetBootstrap({
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

  // Wrap bootstrap errors into a toast
  const bootstrapWithToast = useCallback(async (assetId: string) => {
    try {
      setToast(null);
      setIsActionInFlight(false);
      await bootstrapAsset(assetId);
    } catch {
      showToast("Capture is no longer available.", "error");
    }
  }, [bootstrapAsset]);
  const bootstrapWithToastRef = useRef(bootstrapWithToast);
  bootstrapWithToastRef.current = bootstrapWithToast;

  const clearAllInSession = useCallback(() => {
    documents.forEach(doc => {
      patchDocument(doc.id, {
        annotation: { ...doc.annotation, objects: [], selectedId: null, editingTextId: null },
        cropBounds: null,
        undoStack: [],
      });
      generateThumbnail(doc.image).then(thumb => {
        patchDocument(doc.id, { thumbnailSrc: thumb });
      });
    });
  }, [documents, patchDocument]);

  useEffect(() => {
    let mounted = true;
    let unlisten: null | (() => void) = null;
    void listen<QuickAccessShowPayload>("quick-access-show", (event) => {
      refreshSettings();
      void bootstrapWithToastRef.current(event.payload.asset_id);
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
  }, [refreshSettings]);

  useEffect(() => {
    if (initialAssetHandledRef.current) {
      return;
    }
    const searchParams = new URLSearchParams(window.location.search);
    const initialId = searchParams.get("asset_id");
    if (initialId) {
      initialAssetHandledRef.current = true;
      void bootstrapWithToastRef.current(initialId);
    }
  }, []);

  const expandedPanelWidth = Math.min(
    LEFT_PANEL_MAX_WIDTH,
    Math.max(LEFT_PANEL_MIN_WIDTH, Math.round(viewportSize.width * 0.2))
  );
  const leftPanelWidth = isLeftPanelCollapsed ? LEFT_PANEL_COLLAPSED_WIDTH : expandedPanelWidth;
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
  } =
    usePreviewMetrics(image, preset, viewportSize, leftPanelReserve);

  useEffect(() => {
    if (!canvasRef.current || !image) return;
    composeToCanvas(canvasRef.current, image, preset, previewRenderScale);
  }, [image, preset, wallpaperFlip, dims, previewRenderScale]);

  useEffect(() => {
    if (preset.bg_mode === "Wallpaper") {
      if (getOrLoadWallpaper(preset.bg_value)) return;
      preloadWallpaper(preset.bg_value).then(() => setWallpaperFlip(v => v + 1)).catch(console.error);
    }
  }, [preset.bg_mode, preset.bg_value]);

  const handleDismiss = useCallback(async () => {
    const allDocs = clearAll();
    allDocs.forEach(releaseDocument);
    await getCurrentWindow().close();
  }, [clearAll, releaseDocument]);

  return (
    <div className="xs-shell">
      <TitleBar title="Xensnip" onClose={handleDismiss} />
      <div className="xs-editor-glow" />
      
      <div className="xs-viewport">
        <LeftPanel 
          documents={documents}
          activeDocumentId={activeDocumentId}
          isCollapsed={isLeftPanelCollapsed}
          expandedWidth={expandedPanelWidth}
          onCollapsedChange={setIsLeftPanelCollapsed}
          onSelect={handleSwitchDocument}
          onCheckboxToggle={(id) => {
            const doc = docsRef.current.find(d => d.id === id);
            if (doc) updateCheckbox(id, !doc.isExportChecked);
          }}
          onDelete={(id) => {
            const result = removeDocument(id);
            if (result) {
              const { removed, nextActiveId, remainingDocs } = result;
              releaseDocument(removed);
              
              if (nextActiveId) {
                // Restore the next document into editor shell
                const nextDoc = remainingDocs.find(d => d.id === nextActiveId);
                if (nextDoc) {
                  setImage(nextDoc.image);
                  useAnnotationStore.getState().restoreSnapshot(nextDoc.annotation);
                  setCropBounds(nextDoc.cropBounds);
                  undoStackRef.current = [...nextDoc.undoStack];
                }
              } else if (remainingDocs.length === 0) {
                // Empty session
                setImage(null);
                useAnnotationStore.getState().clearAll();
                setCropBounds(null);
                undoStackRef.current = [];
              }
            }
          }}
        />

        {activeDoc && image ? (
          <div
            className="xs-canvas-area"
            style={{
              position: 'relative',
              paddingTop: `${layout.topInset}px`,
              paddingRight: `${layout.rightRailReserve}px`,
              paddingBottom: `${layout.bottomInset}px`,
              paddingLeft: `${layout.leftPanelReserve}px`,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: `${previewW}px`,
                height: `${previewH}px`,
                transform: `translateX(${previewCenterOffsetX}px)`,
              }}
            >
              <canvas
                key={`${preset.ratio}-${dims.canvasW}-${dims.canvasH}-${previewRenderScale}`}
                ref={canvasRef}
                className="xs-canvas"
                style={{ width: '100%', height: '100%' }}
              />
              <AnnotationStage 
                width={previewW} 
                height={previewH} 
                scale={previewScale} 
                compositionCanvasRef={canvasRef} 
                stageRef={stageRef}
              />
              <div id="annotation-ui-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1000 }}>
                <FloatingToolbarManager scale={previewScale} stageRef={stageRef} />
              </div>

              {activeTool === 'crop' && cropBounds && (
                <CropOverlay
                  bounds={cropBounds}
                  onUpdate={setCropBounds}
                  onCommit={commitCrop}
                  onCancel={cancelCrop}
                  scale={previewScale}
                  imageWidth={image.width}
                  imageHeight={image.height}
                  hasAnnotations={hasAnnotations}
                />
              )}
              
              {activePop === "shadow" && preset.shadow_enabled && (
                <ShadowDotOverlay
                  preset={preset}
                  centerX={centerX}
                  centerY={centerY}
                  previewScale={previewScale}
                  canvasRef={canvasRef}
                  onPresetChange={setPreset}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="xs-loading">
            {isLoading ? "Loading capture..." : "No capture yet. Use a hotkey or the tray menu to start."}
          </div>
        )}
        <div className="xs-dock-spacer" style={{ height: `${layout.dockReserve}px`, flexBasis: `${layout.dockReserve}px` }} />
      </div>

      {activeDoc && image && (
        <div
          className="xs-dock-container"
          style={{ left: `calc(50% + ${previewViewportCenterOffsetX}px)` }}
        >
          <QuickBar
            preset={preset} setPreset={setPreset} image={image}
            isActionInFlight={isActionInFlight} setIsActionInFlight={setIsActionInFlight}
            showToast={showToast} activePop={activePop} onActivePopChange={setActivePop}
            settings={settings} onRefreshSettings={refreshSettings}
            onOpenPresetManager={() => setIsPresetManagerOpen(true)}
            documents={documents}
            activeDocument={activeDoc}
            onClearAllSession={clearAllInSession}
            onFlush={flushActiveDocument}
          />
        </div>
      )}

      {isPresetManagerOpen && (
        <PresetManager 
          settings={settings} onRefresh={refreshSettings}
          onClose={() => setIsPresetManagerOpen(false)} showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
      <RightSidebar />
    </div>
  );
}
