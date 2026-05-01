import { useEffect, useRef, useState, useCallback } from "react";
import { loadImage, composeToCanvas } from "../compose/compose";
import { getCompositionDimensions } from "../compose/core";
import { DEFAULT_PRESET, EditorPreset } from "../compose/preset";
import { autoBalance } from "./autoBalance";
import { QuickBar } from "./QuickBar";
import { EmptyState } from "./EmptyState";
import { Toast } from "./Toast";

export function EditorHost() {
  const [assetId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("asset_id");
  });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<EditorPreset>(DEFAULT_PRESET);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePop, setActivePop] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (assetId) {
      void (async () => {
        try {
          const img = await loadImage(`xensnip-asset://localhost/${assetId}`);
          setImage(img);
          const balancedPadding = autoBalance(img.width, img.height, DEFAULT_PRESET.ratio);
          setPreset(prev => ({ ...prev, padding: balancedPadding }));
        } catch (err) {
          setError("Could not load captured screenshot.");
        }
      })();
    }
  }, [assetId]);

  const draw = useCallback(() => {
    if (!canvasRef.current || !image) return;
    try {
      composeToCanvas(canvasRef.current, image, preset);
    } catch (err) {
      console.error("Draw error:", err);
    }
    // Loop
    rafIdRef.current = requestAnimationFrame(draw);
  }, [image, preset]);

  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(draw);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [draw]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const dims = image ? getCompositionDimensions(image.width, image.height, preset) : { canvasW: 0, canvasH: 0 };

  // Explicit preview scaling based on window size
  // Budget values from anh Phu's proposal
  const previewBudgetW = window.innerWidth * 0.74;
  const previewBudgetH = window.innerHeight * 0.66;
  
  const previewScale = dims.canvasW > 0 
    ? Math.min(previewBudgetW / dims.canvasW, previewBudgetH / dims.canvasH, 1)
    : 1;

  const previewW = Math.floor(dims.canvasW * previewScale);
  const previewH = Math.floor(dims.canvasH * previewScale);

  return (
    <div className="xs-app">
      {/* INLINE CSS TO BYPASS ALL CACHE ISSUES */}
      <style>{`
        .xs-app {
          width: 100vw; height: 100vh;
          background: #0f172a;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          font-family: 'Inter', -apple-system, sans-serif;
          position: relative; overflow: hidden;
        }
        .xs-bg-glow {
          position: absolute; width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(59,130,246,0.15), transparent);
          filter: blur(100px); pointer-events: none; z-index: 0;
        }
        .xs-viewport {
          flex: 1; display: flex; flex-direction: column; 
          z-index: 1; width: 100%; height: 100%;
        }
        .xs-canvas-area {
          flex: 1; display: flex; align-items: center; justify-content: center;
          width: 100%; padding: 20px;
        }
        .xs-dock-spacer {
          height: 140px; width: 100%; pointer-events: none;
        }
        .xs-main-canvas {
          display: block;
          border-radius: 12px; box-shadow: 0 30px 90px rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.05);
          background: #000;
        }
        .xs-dock-container {
          position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
          z-index: 100;
        }
        .xs-dock {
          background: rgba(13, 19, 32, 0.92);
          backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%);
          padding: 8px 12px; border-radius: 14px;
          display: flex; align-items: center; gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 1px 0 0 rgba(255, 255, 255, 0.05),
            inset -1px 0 0 rgba(255, 255, 255, 0.05),
            0 8px 32px rgba(0, 0, 0, 0.55),
            0 2px 8px rgba(0, 0, 0, 0.35);
        }
        .xs-btn {
          border: none; background: transparent; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          padding: 0; transition: all 0.18s ease; font-family: inherit;
        }
        .xs-pill-btn {
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09);
          border-radius: 8px; padding: 0 12px; height: 34px;
          font-size: 13px; font-weight: 500; color: #f8fafc; gap: 6px;
        }
        .xs-pill-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15); }
        .xs-pill-btn.active { border-color: #3b82f6; color: #93c5fd; background: rgba(59,130,246,0.1); }
        .xs-icon-btn {
          width: 36px; height: 36px; border-radius: 8px;
          color: #94a3b8;
        }
        .xs-icon-btn:hover { background: rgba(255,255,255,0.08); color: #f8fafc; }
        .xs-icon-btn.active { background: rgba(59,130,246,0.1); color: #3b82f6; }

        .xs-swatch {
          width: 28px; height: 28px; border-radius: 50%;
          border: 2.5px solid transparent; cursor: pointer;
          transition: transform 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .xs-swatch.active { border-color: rgba(255,255,255,0.8); box-shadow: 0 0 0 1.5px #3b82f6; }
        .xs-swatch:hover { transform: scale(1.15); }

        .xs-action-primary {
          background: #3b82f6; color: #fff; padding: 0 16px; height: 34px;
          border-radius: 10px; font-weight: 600; font-size: 13px; border: none;
          box-shadow: 0 2px 8px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
          gap: 6px; font-family: inherit; cursor: pointer; transition: all 0.18s ease;
        }
        .xs-action-primary:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.2); }
        .xs-action-primary:active { transform: translateY(0); }
        .xs-action-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .xs-action-secondary {
          background: rgba(255,255,255,0.06); color: #f8fafc; padding: 0 16px; height: 34px;
          border-radius: 10px; font-weight: 600; font-size: 13px;
          border: 1px solid rgba(255,255,255,0.12); gap: 6px;
          font-family: inherit; cursor: pointer; transition: all 0.18s ease;
        }
        .xs-action-secondary:hover { background: rgba(255,255,255,0.11); border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
        .xs-action-secondary:active { transform: translateY(0); }
        .xs-action-secondary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .xs-divider { width: 1px; height: 22px; background: rgba(255,255,255,0.09); margin: 0 2px; }

        .xs-pop {
          position: absolute;
          bottom: calc(100% + 14px);
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.97);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
          min-width: 200px;
          animation: xs-slide 0.3s cubic-bezier(0.2, 1, 0.3, 1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #f8fafc;
        }
        @keyframes xs-slide {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div className="xs-bg-glow" style={{ top: '-10%', left: '-10%' }} />
      <div className="xs-bg-glow" style={{ bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(139,92,246,0.1), transparent)' }} />

      {error ? (
        <div style={{ color: '#ef4444' }}>{error}</div>
      ) : assetId && image ? (
        <div className="xs-viewport">
          <div className="xs-canvas-area">
            <canvas 
              key={`${preset.ratio}-${dims.canvasW}-${dims.canvasH}`}
              ref={canvasRef} 
              width={dims.canvasW} 
              height={dims.canvasH} 
              className="xs-main-canvas" 
              style={{ width: `${previewW}px`, height: `${previewH}px` }}
            />
          </div>
          <div className="xs-dock-spacer" />
        </div>
      ) : (
        <EmptyState showToast={showToast} />
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
