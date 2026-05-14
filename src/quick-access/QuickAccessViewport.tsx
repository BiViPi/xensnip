import Konva from "konva";
import { EditorPreset } from "../compose/preset";
import { ScreenshotDocument } from "../editor/useScreenshotDocuments";
import { CropBounds } from "../editor/useCropTool";
import { LeftPanel } from "../left-panel/LeftPanel";
import { QuickAccessCanvasArea } from "./QuickAccessCanvasArea";

interface ViewportLayout {
  topInset: number;
  rightRailReserve: number;
  bottomInset: number;
  leftPanelReserve: number;
  dockReserve: number;
}

interface CanvasDims {
  canvasW: number;
  canvasH: number;
}

interface QuickAccessViewportProps {
  documents: ScreenshotDocument[];
  activeDocumentId: string | null;
  activeDoc: ScreenshotDocument | null;
  image: HTMLImageElement | null;
  isLoading: boolean;
  isLeftPanelCollapsed: boolean;
  expandedPanelWidth: number;
  layout: ViewportLayout;
  dims: CanvasDims;
  previewW: number;
  previewH: number;
  previewScale: number;
  previewRenderScale: number;
  previewCenterOffsetX: number;
  centerX: number;
  centerY: number;
  preset: EditorPreset;
  activeTool: string;
  activePop: string | null;
  cropBounds: CropBounds | null;
  hasAnnotations: boolean;
  wallpaperFlip: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelectDocument: (id: string) => void;
  onToggleCheckbox: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onRenameDocument: (id: string, name: string | undefined) => void;
  onPresetChange: (preset: EditorPreset) => void;
  onCropBoundsChange: (bounds: CropBounds | null) => void;
  onCommitCrop: () => void;
  onCancelCrop: () => void;
}

export function QuickAccessViewport({
  documents,
  activeDocumentId,
  activeDoc,
  image,
  isLoading,
  isLeftPanelCollapsed,
  expandedPanelWidth,
  layout,
  dims,
  previewW,
  previewH,
  previewScale,
  previewRenderScale,
  previewCenterOffsetX,
  centerX,
  centerY,
  preset,
  activeTool,
  activePop,
  cropBounds,
  hasAnnotations,
  wallpaperFlip,
  canvasRef,
  stageRef,
  onCollapsedChange,
  onSelectDocument,
  onToggleCheckbox,
  onDeleteDocument,
  onRenameDocument,
  onPresetChange,
  onCropBoundsChange,
  onCommitCrop,
  onCancelCrop,
}: QuickAccessViewportProps) {
  return (
    <div className="xs-viewport">
      <LeftPanel
        documents={documents}
        activeDocumentId={activeDocumentId}
        isCollapsed={isLeftPanelCollapsed}
        expandedWidth={expandedPanelWidth}
        onCollapsedChange={onCollapsedChange}
        onSelect={onSelectDocument}
        onCheckboxToggle={onToggleCheckbox}
        onDelete={onDeleteDocument}
        onRename={onRenameDocument}
      />

      {activeDoc && image ? (
        <QuickAccessCanvasArea
          image={image}
          preset={preset}
          dims={dims}
          previewW={previewW}
          previewH={previewH}
          previewScale={previewScale}
          previewRenderScale={previewRenderScale}
          previewCenterOffsetX={previewCenterOffsetX}
          centerX={centerX}
          centerY={centerY}
          layout={layout}
          activeTool={activeTool}
          activePop={activePop}
          cropBounds={cropBounds}
          hasAnnotations={hasAnnotations}
          wallpaperFlip={wallpaperFlip}
          canvasRef={canvasRef}
          stageRef={stageRef}
          onPresetChange={onPresetChange}
          onCropBoundsChange={onCropBoundsChange}
          onCommitCrop={onCommitCrop}
          onCancelCrop={onCancelCrop}
        />
      ) : (
        <div className="xs-loading">
          {isLoading
            ? "Loading capture..."
            : "No capture yet. Use a hotkey or the tray menu to start."}
        </div>
      )}

      <div
        className="xs-dock-spacer"
        style={{
          height: `${layout.dockReserve}px`,
          flexBasis: `${layout.dockReserve}px`,
        }}
      />
    </div>
  );
}
