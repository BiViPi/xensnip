import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  assetReadPng,
  assetRelease,
  quickAccessMarkReady,
  assetResolve,
  perfLog,
  settingsLoad,
} from "../ipc/index";
import { QuickAccessShowPayload, Settings, ThemeMode } from "../ipc/types";
import { applyTheme } from "../styles/applyTheme";
import { composeToCanvas } from "../compose/compose";
import { DEFAULT_PRESET, EditorPreset } from "../compose/preset";
import { preloadWallpaper, getOrLoadWallpaper } from "../compose/core";
import { autoBalance } from "../editor/autoBalance";
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
import { registerHistoryRecorder, withHistorySuspended } from "../editor/historyBridge";
import { useScreenshotDocuments, ScreenshotDocument, DocumentStateSnapshot, DocumentUndoSnapshot } from "../editor/useScreenshotDocuments";
import { generateThumbnail } from "../editor/generateThumbnail";
import { LeftPanel } from "../left-panel/LeftPanel";
import "./QuickAccess.css";

// EditorSnapshot is replaced by DocumentUndoSnapshot in the per-document stack

const HISTORY_LIMIT = 50;
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
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [wallpaperFlip, setWallpaperFlip] = useState(0);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
  const [activePop, setActivePop] = useState<string | null>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<any>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const initialAssetHandledRef = useRef(false);
  const undoStackRef = useRef<DocumentUndoSnapshot[]>([]);
  const bootstrapAssetRef = useRef<(assetId: string) => Promise<void> | void>(() => {});

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
  }, [activeDocumentId, cropBounds, image, switchToDocument]);

  const buildAnnotationSnapshot = useCallback(() => {
    const s = useAnnotationStore.getState();
    return {
      activeTool: s.activeTool,
      objects: s.objects.map(obj => ({ ...obj })),
      selectedId: s.selectedId,
      editingTextId: s.editingTextId,
      toolbarCollapsed: s.toolbarCollapsed,
    };
  }, []);

  const buildSnapshot = useCallback((): DocumentUndoSnapshot | null => {
    if (!image?.src) return null;

    return {
      imageSrc: image.src,
      annotation: buildAnnotationSnapshot(),
      cropBounds: cropBounds ? { ...cropBounds } : null,
    };
  }, [cropBounds, image, buildAnnotationSnapshot]);

  const loadSnapshotImage = useCallback(async (src: string) => {
    const img = new Image();
    img.src = src;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to restore snapshot image"));
    });
    return img;
  }, []);

  const pushHistorySnapshot = useCallback(() => {
    const snapshot = buildSnapshot();
    if (!snapshot) return;

    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    if (
      previous &&
      previous.imageSrc === snapshot.imageSrc &&
      JSON.stringify(previous.annotation) === JSON.stringify(snapshot.annotation) &&
      JSON.stringify(previous.cropBounds) === JSON.stringify(snapshot.cropBounds)
    ) {
      return;
    }

    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > HISTORY_LIMIT) {
      undoStackRef.current.shift();
    }
  }, [buildSnapshot]);

  const handleUndo = useCallback(async () => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;

    try {
      const restoredImage = await loadSnapshotImage(snapshot.imageSrc);
      withHistorySuspended(() => {
        setImage(restoredImage);
        // Shared preset is intentionally excluded from per-document undo
        useAnnotationStore.getState().restoreSnapshot(snapshot.annotation);
        setCropBounds(snapshot.cropBounds ? { ...snapshot.cropBounds } : null);
      });
    } catch (error) {
      console.error("Undo restore failed", error);
    }
  }, [loadSnapshotImage, setCropBounds]);

  const handleSwitchDocument = useCallback((nextId: string) => {
    const activeId = activeIdRef.current;
    if (nextId === activeId) return;

    // 1. Cancel active crop if running
    if (activeTool === 'crop') cancelCrop();

    // 2. Build current state snapshot
    const snapshot: DocumentStateSnapshot = {
      annotation: buildAnnotationSnapshot(),
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

  const bootstrapAsset = useCallback(async (nextAssetId: string) => {
    // Check if we already have this asset using stable docsRef
    if (docsRef.current.some(d => d.assetId === nextAssetId)) {
      const existing = docsRef.current.find(d => d.assetId === nextAssetId)!;
      handleSwitchDocument(existing.id);
      return;
    }

    setIsLoading(true);
    setToast(null);
    setIsActionInFlight(false);

    try {
      const bootstrapStart = performance.now();
      
      const resolveStart = performance.now();
      // Acquire ref-count for this consumer. URI is unused here;
      // image bytes are read via assetReadPng() on the IPC path (Step 4 will switch to xensnip-asset://).
      await assetResolve(nextAssetId, "quick_access_ui");
      void perfLog(`Asset resolve ref-count took ${Math.round(performance.now() - resolveStart)}ms`);

      const readStart = performance.now();
      const bytes = await assetReadPng(nextAssetId);
      void perfLog(`Asset read over IPC took ${Math.round(performance.now() - readStart)}ms (size: ${bytes.length})`);

      const decodeStart = performance.now();
      const blob = new Blob([bytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load blob image"));
      });
      void perfLog(`Image decode took ${Math.round(performance.now() - decodeStart)}ms (${img.naturalWidth}x${img.naturalHeight})`);

      const newDoc: ScreenshotDocument = {
        id: crypto.randomUUID(),
        image: img,
        blobUrl: url,
        assetId: nextAssetId,
        thumbnailSrc: "", // Placeholder initially
        annotation: {
          activeTool: 'select',
          objects: [],
          selectedId: null,
          editingTextId: null,
          toolbarCollapsed: false,
        },
        cropBounds: null,
        isExportChecked: true, // Default to checked for export
        undoStack: [],
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
        const def = currentSettings.saved_presets.find(p => p.id === currentSettings.default_preset_id);
        if (def) setPreset({ ...DEFAULT_PRESET, ...def.preset });
        else setPreset({ ...DEFAULT_PRESET, padding: autoBalance(img.width, img.height, DEFAULT_PRESET.ratio) });
      } else {
        setPreset({ ...DEFAULT_PRESET, padding: autoBalance(img.width, img.height, DEFAULT_PRESET.ratio) });
      }

      // Defer thumbnail generation
      setTimeout(async () => {
        const thumbStart = performance.now();
        const thumb = await generateThumbnail(img);
        void perfLog(`Deferred thumbnail generation took ${Math.round(performance.now() - thumbStart)}ms`);
        patchDocument(newDoc.id, { thumbnailSrc: thumb });
      }, 0);

    } catch (e) {
      console.error("Bootstrap failed", e);
      showToast("Capture is no longer available.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addDocument, releaseDocument, handleSwitchDocument, setActiveDocumentId, setCropBounds, docsRef, patchDocument]);
  bootstrapAssetRef.current = bootstrapAsset;

  const clearAllInSession = useCallback(() => {
    documents.forEach(doc => {
      doc.annotation.objects = [];
      doc.cropBounds = null;
      doc.undoStack = [];
    });
    // Trigger re-render of thumbnails
    documents.forEach(doc => {
      generateThumbnail(doc.image).then(thumb => {
        doc.thumbnailSrc = thumb;
      });
    });
  }, [documents]);

  useEffect(() => {
    let mounted = true;
    let unlisten: null | (() => void) = null;
    void listen<QuickAccessShowPayload>("quick-access-show", (event) => {
      refreshSettings();
      void bootstrapAssetRef.current(event.payload.asset_id);
    }).then((fn) => {
      if (mounted) {
        unlisten = fn;
        void quickAccessMarkReady().then(() => {
          void perfLog("Quick Access window listener attached and ready");
        }).catch(console.error);
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
      void bootstrapAssetRef.current(initialId);
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

  const handleShadowDrag = useCallback((e: any) => {
    if (!image || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180 / Math.PI) + 90;
    const distance = Math.sqrt(dx * dx + dy * dy) / previewScale;

    setPreset(prev => ({
      ...prev,
      shadow_angle: Math.round((angleDeg + 360) % 360),
      shadow_offset: Math.round(Math.min(distance, 150))
    }));
  }, [image, centerX, centerY, previewScale]);

  const onMouseDownShadow = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMouseMove = (ee: MouseEvent) => handleShadowDrag(ee);
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const angleRad = (preset.shadow_angle - 90) * (Math.PI / 180);
  const dotX = centerX + Math.cos(angleRad) * (preset.shadow_offset * previewScale);
  const dotY = centerY + Math.sin(angleRad) * (preset.shadow_offset * previewScale);

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
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <line x1={centerX} y1={centerY} x2={dotX} y2={dotY} stroke="#6366F1" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5" />
                  </svg>
                  <div 
                    onMouseDown={onMouseDownShadow}
                    style={{
                      position: 'absolute', left: `${dotX}px`, top: `${dotY}px`,
                      width: '16px', height: '16px', background: '#6366F1', border: '2px solid white',
                      borderRadius: '50%', transform: 'translate(-50%, -50%)', cursor: 'move',
                      pointerEvents: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', zIndex: 2000
                    }}
                  />
                  <div style={{
                    position: 'absolute', left: `${centerX}px`, top: `${centerY}px`,
                    width: '6px', height: '6px', background: '#fff', border: '1.5px solid #6366F1',
                    borderRadius: '50%', transform: 'translate(-50%, -50%)'
                  }} />
                </div>
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
