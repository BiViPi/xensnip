import { useCallback } from "react";
import { EditorPreset } from "../compose/preset";

interface ShadowDotOverlayProps {
  preset: EditorPreset;
  centerX: number;
  centerY: number;
  previewScale: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPresetChange: (p: EditorPreset) => void;
}

export function ShadowDotOverlay({
  preset,
  centerX,
  centerY,
  previewScale,
  canvasRef,
  onPresetChange,
}: ShadowDotOverlayProps) {
  const handleShadowDrag = useCallback(
    (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI + 90;
      const distance = Math.sqrt(dx * dx + dy * dy) / previewScale;

      onPresetChange({
        ...preset,
        shadow_angle: Math.round((angleDeg + 360) % 360),
        shadow_offset: Math.round(Math.min(distance, 150)),
      });
    },
    [canvasRef, centerX, centerY, previewScale, preset, onPresetChange]
  );

  const onPointerDownShadow = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    
    const onPointerMove = (ee: PointerEvent) => handleShadowDrag(ee);
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove as EventListener);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove as EventListener);
    window.addEventListener("pointerup", onPointerUp);
  };

  const angleRad = ((preset.shadow_angle - 90) * Math.PI) / 180;
  const dotX = centerX + Math.cos(angleRad) * (preset.shadow_offset * previewScale);
  const dotY = centerY + Math.sin(angleRad) * (preset.shadow_offset * previewScale);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <line
          x1={centerX}
          y1={centerY}
          x2={dotX}
          y2={dotY}
          stroke="#6366F1"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
      </svg>
      <div
        onPointerDown={onPointerDownShadow}
        style={{
          position: "absolute",
          left: `${dotX}px`,
          top: `${dotY}px`,
          width: "16px",
          height: "16px",
          background: "#6366F1",
          border: "2px solid white",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          cursor: "move",
          pointerEvents: "auto",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          zIndex: 2000,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${centerX}px`,
          top: `${centerY}px`,
          width: "6px",
          height: "6px",
          background: "#fff",
          border: "1.5px solid #6366F1",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
