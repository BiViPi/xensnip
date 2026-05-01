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
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding-bottom: 120px; z-index: 1; width: 100%;
        }
        .xs-main-canvas {
          max-width: 90%; max-height: 85%;
          border-radius: 12px; box-shadow: 0 30px 90px rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .xs-dock-container {
          position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
          z-index: 100;
        }
        .xs-dock {
          background: rgba(255, 255, 255, 0.95); /* Light Dock by default for premium look */
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          padding: 8px 12px; border-radius: 100px;
          display: flex; align-items: center; gap: 8px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
        }
        .xs-btn {
          border: none; background: transparent; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          padding: 0; transition: all 0.2s ease;
        }
        .xs-pill-btn {
          background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05);
          border-radius: 100px; padding: 6px 14px;
          font-size: 13px; font-weight: 600; color: #1e293b; gap: 6px;
        }
        .xs-pill-btn:hover { background: rgba(0,0,0,0.08); }
        .xs-icon-btn {
          width: 36px; height: 36px; border-radius: 10px;
          color: #64748b;
        }
        .xs-icon-btn:hover { background: rgba(0,0,0,0.05); color: #0f172a; }
        .xs-icon-btn.active { background: rgba(59,130,246,0.1); color: #3b82f6; }
        
        .xs-swatch {
          width: 28px; height: 28px; border-radius: 50%;
          border: 2.5px solid transparent; cursor: pointer;
          transition: transform 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .xs-swatch.active { border-color: #fff; box-shadow: 0 0 0 1.5px #3b82f6; }
        .xs-swatch:hover { transform: scale(1.15); }
        
        .xs-action-primary {
          background: #3b82f6; color: #fff; padding: 8px 18px;
          border-radius: 100px; font-weight: 600; font-size: 13px;
          box-shadow: 0 4px 12px rgba(59,130,246,0.3); gap: 6px;
        }
        .xs-action-primary:hover { background: #2563eb; transform: translateY(-1px); }
        
        .xs-action-secondary {
          background: #fff; color: #1e293b; padding: 8px 18px;
          border-radius: 100px; font-weight: 600; font-size: 13px;
          border: 1px solid #e2e8f0; gap: 6px;
        }
        .xs-action-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }
        
        .xs-divider { width: 1px; height: 24px; background: #e2e8f0; margin: 0 4px; }
        
        .xs-pop {
          position: absolute; 
          bottom: calc(100% + 14px); 
          left: 50%;
          transform: translateX(-50%); 
          background: #fff;
          border-radius: 20px; 
          padding: 12px; 
          box-shadow: 0 20px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
          border: 1px solid rgba(0,0,0,0.05); 
          min-width: 200px;
          animation: xs-slide 0.3s cubic-bezier(0.2, 1, 0.3, 1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
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
          <canvas ref={canvasRef} width={dims.canvasW} height={dims.canvasH} className="xs-main-canvas" />
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
          />
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
