import { useEffect } from "react";
import Konva from "konva";
import { composeCanvasDocumentToCanvas } from "../compose/compose";
import { EditorPreset } from "../compose/preset";
import { AnnotationStage } from "../annotate/AnnotationStage";
import { FloatingToolbarManager } from "../annotate/floating/FloatingToolbarManager";
import { CropOverlay } from "../editor/CropOverlay";
import { ShadowDotOverlay } from "../editor/ShadowDotOverlay";
import { CropBounds } from "../editor/useCropTool";
import { CanvasDocument, getSelectedCanvasImage } from "../editor/canvasDocument";
import { CanvasImageOverlay } from "../editor/CanvasImageOverlay";
import { getCanvasDocumentDimensions } from "../compose/canvasDocument";

interface CanvasAreaLayout {
  topInset: number;
  rightRailReserve: number;
  bottomInset: number;
  leftPanelReserve: number;
}

interface CanvasDims {
  canvasW: number;
  canvasH: number;
}

interface QuickAccessCanvasAreaProps {
  image: HTMLImageElement;
  canvasDocument: CanvasDocument;
  preset: EditorPreset;
  dims: CanvasDims;
  previewW: number;
  previewH: number;
  previewScale: number;
  previewRenderScale: number;
  previewCenterOffsetX: number;
  centerX: number;
  centerY: number;
  layout: CanvasAreaLayout;
  activeTool: string;
  activePop: string | null;
  cropBounds: CropBounds | null;
  hasAnnotations: boolean;
  wallpaperFlip: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
  onPresetChange: (preset: EditorPreset) => void;
  onCropBoundsChange: (bounds: CropBounds | null) => void;
  onCanvasDocumentChange: (canvasDocument: CanvasDocument) => void;
  onCommitCrop: () => void;
  onCancelCrop: () => void;
}

export function QuickAccessCanvasArea({
  image,
  canvasDocument,
  preset,
  dims,
  previewW,
  previewH,
  previewScale,
  previewRenderScale,
  previewCenterOffsetX,
  centerX,
  centerY,
  layout,
  activeTool,
  activePop,
  cropBounds,
  hasAnnotations,
  wallpaperFlip,
  canvasRef,
  stageRef,
  onPresetChange,
  onCropBoundsChange,
  onCanvasDocumentChange,
  onCommitCrop,
  onCancelCrop,
}: QuickAccessCanvasAreaProps) {
  // Redraw the composition whenever image, preset, layout, or wallpaper changes.
  // wallpaperFlip is a counter bumped by the shell when a wallpaper finishes loading.
  useEffect(() => {
    if (!canvasRef.current) return;
    composeCanvasDocumentToCanvas(canvasRef.current, canvasDocument, preset, previewRenderScale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, canvasDocument, preset, wallpaperFlip, dims, previewRenderScale]);

  const canvasDims = getCanvasDocumentDimensions(canvasDocument, preset);
  const selectedImage = getSelectedCanvasImage(canvasDocument);

  return (
    <div
      className="xs-canvas-area"
      style={{
        position: "relative",
        paddingTop: `${layout.topInset}px`,
        paddingRight: `${layout.rightRailReserve}px`,
        paddingBottom: `${layout.bottomInset}px`,
        paddingLeft: `${layout.leftPanelReserve}px`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: `${previewW}px`,
          height: `${previewH}px`,
          transform: `translateX(${previewCenterOffsetX}px)`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="xs-canvas"
          style={{ width: "100%", height: "100%" }}
        />
        <CanvasImageOverlay
          canvasDocument={canvasDocument}
          preset={preset}
          previewScale={previewScale}
          interactive={activeTool === "select"}
          onCanvasDocumentChange={onCanvasDocumentChange}
        />
        <AnnotationStage
          width={previewW}
          height={previewH}
          scale={previewScale}
          compositionCanvasRef={canvasRef}
          stageRef={stageRef}
          image={image}
          preset={preset}
        />
        <div
          id="annotation-ui-overlay"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <FloatingToolbarManager scale={previewScale} stageRef={stageRef} />
        </div>

        {activeTool === "crop" && cropBounds && (
          <CropOverlay
            bounds={cropBounds}
            onUpdate={onCropBoundsChange}
            onCommit={onCommitCrop}
            onCancel={onCancelCrop}
            scale={previewScale}
            resizeBounds={{
              minX: (selectedImage?.x ?? 0) + canvasDims.contentOffsetX,
              minY: (selectedImage?.y ?? 0) + canvasDims.contentOffsetY,
              maxX: (selectedImage ? selectedImage.x + selectedImage.width : 0) + canvasDims.contentOffsetX,
              maxY: (selectedImage ? selectedImage.y + selectedImage.height : 0) + canvasDims.contentOffsetY,
            }}
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
            onPresetChange={onPresetChange}
          />
        )}
      </div>
    </div>
  );
}
