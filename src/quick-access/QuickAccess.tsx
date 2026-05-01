import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  quickAccessDismiss,
  assetReadPng,
  assetRelease,
  assetResolve,
  quickAccessSetBusy,
} from "../ipc/index";
import { QuickAccessShowPayload } from "../ipc/types";
import { composeToCanvas } from "../compose/compose";
import { DEFAULT_PRESET, EditorPreset } from "../compose/preset";
import { getCompositionDimensions } from "../compose/core";
import { autoBalance } from "../editor/autoBalance";
import { QuickBar } from "../editor/QuickBar";
import { Toast } from "../editor/Toast";
import { TitleBar } from "../editor/TitleBar";

export function QuickAccess() {
  const [assetId, setAssetId] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<EditorPreset>(DEFAULT_PRESET);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const bootstrappedAssetIdRef = useRef<string | null>(null);
  const resolvedAssetIdRef = useRef<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (assetId) {
      void quickAccessSetBusy(assetId, isActionInFlight).catch(() => {});
    }
  }, [assetId, isActionInFlight]);

  const handleDismiss = useCallback(async () => {
    const targetId = assetId;
    if (!targetId) return;
    try {
      await quickAccessDismiss(targetId);
    } catch {
      // Native window close hook handles actual destruction
    }
  }, [assetId]);

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

      const balancedPadding = autoBalance(img.width, img.height, DEFAULT_PRESET.ratio);
      setPreset({ ...DEFAULT_PRESET, padding: balancedPadding });
    } catch (e) {
      console.error("Bootstrap failed", e);
      bootstrappedAssetIdRef.current = null;
      if (resolvedAssetIdRef.current === nextAssetId) {
        void assetRelease(nextAssetId, "quick_access_ui").catch(() => {});
        resolvedAssetIdRef.current = null;
      }
      showToast("Capture is no longer available.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<QuickAccessShowPayload>("quick-access-show", (event) => {
      void bootstrapAsset(event.payload.asset_id);
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [bootstrapAsset]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const initialId = searchParams.get("asset_id");
    if (initialId) void bootstrapAsset(initialId);
  }, [bootstrapAsset]);

  const draw = useCallback(() => {
    if (!canvasRef.current || !image) return;
    composeToCanvas(canvasRef.current, image, preset);
  }, [image, preset]);

  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(draw);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [draw]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const [activePop, setActivePop] = useState<string | null>(null);

  // Math for Shadow Dot
  const dims = image ? getCompositionDimensions(image.width, image.height, preset) : { canvasW: 0, canvasH: 0, drawX: 0, drawY: 0, drawW: 0, drawH: 0 };
  const previewBudgetW = window.innerWidth * 0.74;
  const previewBudgetH = window.innerHeight * 0.66;
  const previewScale = dims.canvasW > 0 ? Math.min(previewBudgetW / dims.canvasW, previewBudgetH / dims.canvasH, 1) : 1;
  const previewW = Math.floor(dims.canvasW * previewScale);
  const previewH = Math.floor(dims.canvasH * previewScale);

  const handleShadowDrag = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!image || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = (dims.drawX + dims.drawW / 2) * previewScale;
    const centerY = (dims.drawY + dims.drawH / 2) * previewScale;

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180 / Math.PI) + 90;
    const distance = Math.sqrt(dx * dx + dy * dy) / previewScale;

    setPreset(prev => ({
      ...prev,
      shadow_angle: Math.round((angleDeg + 360) % 360),
      shadow_offset: Math.round(Math.min(distance, 150)) // Cap distance
    }));
  }, [image, dims, previewScale]);

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
  const dotX = (dims.drawX + dims.drawW / 2) * previewScale + Math.cos(angleRad) * (preset.shadow_offset * previewScale);
  const dotY = (dims.drawY + dims.drawH / 2) * previewScale + Math.sin(angleRad) * (preset.shadow_offset * previewScale);
  const centerX = (dims.drawX + dims.drawW / 2) * previewScale;
  const centerY = (dims.drawY + dims.drawH / 2) * previewScale;

  return (
    <div className="xs-shell">
      <TitleBar title="Xensnip" onClose={handleDismiss} />
      
      {assetId && image ? (
        <div className="xs-viewport">
          <div className="xs-canvas-area" style={{ position: 'relative' }}>
            <div style={{ position: 'relative', width: `${previewW}px`, height: `${previewH}px` }}>
              <canvas
                key={`${preset.ratio}-${dims.canvasW}-${dims.canvasH}`}
                ref={canvasRef}
                width={dims.canvasW}
                height={dims.canvasH}
                className="xs-canvas"
                style={{ width: '100%', height: '100%' }}
              />
              
              {/* Shadow Dot Controller */}
              {activePop === "shadow" && preset.shadow_enabled && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {/* Line from center */}
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <line 
                      x1={centerX} y1={centerY} x2={dotX} y2={dotY} 
                      stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5"
                    />
                  </svg>
                  {/* The Dot */}
                  <div 
                    onMouseDown={onMouseDownShadow}
                    style={{
                      position: 'absolute',
                      left: `${dotX}px`,
                      top: `${dotY}px`,
                      width: '16px', height: '16px',
                      background: '#3b82f6',
                      border: '2px solid white',
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      cursor: 'move',
                      pointerEvents: 'auto',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                      zIndex: 2000
                    }}
                  />
                  {/* Center Anchor */}
                  <div style={{
                    position: 'absolute',
                    left: `${centerX}px`,
                    top: `${centerY}px`,
                    width: '6px', height: '6px',
                    background: '#fff',
                    border: '1.5px solid #3b82f6',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)'
                  }} />
                </div>
              )}
            </div>
          </div>
          <div className="xs-dock-spacer" />
        </div>
      ) : (
        <div className="xs-viewport">
          <div className="xs-loading">
            {isLoading ? "Loading capture..." : "Capture unavailable."}
          </div>
        </div>
      )}

      {assetId && image && (
        <div className="xs-dock-container">
          <QuickBar
            preset={preset}
            setPreset={setPreset}
            image={image}
            isActionInFlight={isActionInFlight}
            setIsActionInFlight={setIsActionInFlight}
            showToast={showToast}
            activePop={activePop}
            onActivePopChange={setActivePop}
          />
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
