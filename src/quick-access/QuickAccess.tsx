import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  quickAccessDismiss,
  assetReadPng,
  assetRelease,
  assetResolve,
  settingsLoad,
} from "../ipc/index";
import { QuickAccessShowPayload, Settings } from "../ipc/types";
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
import "./QuickAccess.css";

export function QuickAccess() {
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [assetId, setAssetId] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<EditorPreset>(DEFAULT_PRESET);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [wallpaperFlip, setWallpaperFlip] = useState(0);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
  const [activePop, setActivePop] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<any>(null);
  const bootstrappedAssetIdRef = useRef<string | null>(null);
  const resolvedAssetIdRef = useRef<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useKeyboardShortcuts();

  useEffect(() => {
    settingsLoad().then(setSettings).catch(console.error);
    
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const refreshSettings = useCallback(() => {
    settingsLoad().then(setSettings).catch(console.error);
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
  } = useCropTool(image, preset, setImage, setActiveTool);

  useEffect(() => {
    if (activeTool === 'crop') {
      startCrop();
    }
  }, [activeTool, startCrop]);

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

      let currentSettings = await settingsLoad();
      setSettings(currentSettings);

      if (currentSettings?.last_preset) {
        setPreset({ ...DEFAULT_PRESET, ...currentSettings.last_preset });
      } else if (currentSettings?.default_preset_id) {
        const def = currentSettings.saved_presets.find(p => p.id === currentSettings.default_preset_id);
        if (def) setPreset({ ...DEFAULT_PRESET, ...def.preset });
        else setPreset({ ...DEFAULT_PRESET, padding: autoBalance(img.width, img.height, DEFAULT_PRESET.ratio) });
      } else {
        setPreset({ ...DEFAULT_PRESET, padding: autoBalance(img.width, img.height, DEFAULT_PRESET.ratio) });
      }
    } catch (e) {
      console.error("Bootstrap failed", e);
      bootstrappedAssetIdRef.current = null;
      showToast("Capture is no longer available.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let unlisten: any = null;
    listen<QuickAccessShowPayload>("quick-access-show", (event) => {
      refreshSettings();
      void bootstrapAsset(event.payload.asset_id);
    }).then(fn => unlisten = fn);
    return () => unlisten?.();
  }, [bootstrapAsset, refreshSettings]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const initialId = searchParams.get("asset_id");
    if (initialId) void bootstrapAsset(initialId);
  }, [bootstrapAsset]);

  const { dims, previewScale, previewW, previewH, centerX, centerY, layout } = usePreviewMetrics(image, preset, viewportSize);

  useEffect(() => {
    if (!canvasRef.current || !image) return;
    composeToCanvas(canvasRef.current, image, preset);
  }, [image, preset, wallpaperFlip, dims]);

  useEffect(() => {
    if (preset.bg_mode === "Wallpaper") {
      if (getOrLoadWallpaper(preset.bg_value)) return;
      preloadWallpaper(preset.bg_value).then(() => setWallpaperFlip(v => v + 1)).catch(console.error);
    }
  }, [preset.bg_mode, preset.bg_value]);

  const handleDismiss = useCallback(async () => {
    if (assetId) void quickAccessDismiss(assetId).catch(() => {});
  }, [assetId]);

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
    <div className="xs-shell" style={{ backgroundColor: '#05070a' }}>
      <TitleBar title="Xensnip" onClose={handleDismiss} />
      
      <div className="xs-viewport">
        {assetId && image ? (
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
            <div style={{ position: 'relative', width: `${previewW}px`, height: `${previewH}px` }}>
              <canvas
                key={`${preset.ratio}-${dims.canvasW}-${dims.canvasH}`}
                ref={canvasRef}
                width={dims.canvasW}
                height={dims.canvasH}
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
                    <line x1={centerX} y1={centerY} x2={dotX} y2={dotY} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5" />
                  </svg>
                  <div 
                    onMouseDown={onMouseDownShadow}
                    style={{
                      position: 'absolute', left: `${dotX}px`, top: `${dotY}px`,
                      width: '16px', height: '16px', background: '#3b82f6', border: '2px solid white',
                      borderRadius: '50%', transform: 'translate(-50%, -50%)', cursor: 'move',
                      pointerEvents: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', zIndex: 2000
                    }}
                  />
                  <div style={{
                    position: 'absolute', left: `${centerX}px`, top: `${centerY}px`,
                    width: '6px', height: '6px', background: '#fff', border: '1.5px solid #3b82f6',
                    borderRadius: '50%', transform: 'translate(-50%, -50%)'
                  }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="xs-loading">
            {isLoading ? "Loading capture..." : "Capture unavailable."}
          </div>
        )}
        <div className="xs-dock-spacer" style={{ height: `${layout.dockReserve}px`, flexBasis: `${layout.dockReserve}px` }} />
      </div>

      {assetId && image && (
        <div className="xs-dock-container">
          <QuickBar
            preset={preset} setPreset={setPreset} image={image}
            isActionInFlight={isActionInFlight} setIsActionInFlight={setIsActionInFlight}
            showToast={showToast} activePop={activePop} onActivePopChange={setActivePop}
            settings={settings} onRefreshSettings={refreshSettings}
            onOpenPresetManager={() => setIsPresetManagerOpen(true)}
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
