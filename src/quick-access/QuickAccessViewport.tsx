import Konva from "konva";
import type { PointerEvent as ReactPointerEvent } from "react";
import { EditorPreset } from "../compose/preset";
import { ScreenshotDocument } from "../editor/useScreenshotDocuments";
import { CropBounds } from "../editor/useCropTool";
import { LeftPanel } from "../left-panel/LeftPanel";
import { QuickAccessCanvasArea } from "./QuickAccessCanvasArea";
import { StudioCanvas } from "../studio/ui/StudioCanvas";
import type { StudioExportHandle } from "../studio/types";
import type { CanvasDocument } from "../editor/canvasDocument";

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
  dragSourceId: string | null;
  dropTargetId: string | null;
  blockedTargetId: string | null;
  image: HTMLImageElement | null;
  canvasDocument: CanvasDocument | null;
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
  onPointerDownDocument: (id: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerEnterDocument: (id: string) => void;
  onPointerLeaveDocument: (id: string) => void;
  onPresetChange: (preset: EditorPreset) => void;
  onCropBoundsChange: (bounds: CropBounds | null) => void;
  onCanvasDocumentChange: (canvasDocument: CanvasDocument) => void;
  onCommitCrop: () => void;
  onCancelCrop: () => void;
  onExportHandleChange: (h: StudioExportHandle | null) => void;
}

export function QuickAccessViewport({
  documents,
  activeDocumentId,
  activeDoc,
  dragSourceId,
  dropTargetId,
  blockedTargetId,
  image,
  canvasDocument,
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
  onPointerDownDocument,
  onPointerEnterDocument,
  onPointerLeaveDocument,
  onPresetChange,
  onCropBoundsChange,
  onCanvasDocumentChange,
  onCommitCrop,
  onCancelCrop,
  onExportHandleChange,
}: QuickAccessViewportProps) {
  const isStudio = preset.presentation_mode === 'studio' && (canvasDocument?.images.length ?? 0) <= 1;

  return (
    <div className="xs-viewport">
      <LeftPanel
        documents={documents}
        activeDocumentId={activeDocumentId}
        dragSourceId={dragSourceId}
        dropTargetId={dropTargetId}
        blockedTargetId={blockedTargetId}
        isCollapsed={isLeftPanelCollapsed}
        expandedWidth={expandedPanelWidth}
        onCollapsedChange={onCollapsedChange}
        onSelect={onSelectDocument}
        onCheckboxToggle={onToggleCheckbox}
        onDelete={onDeleteDocument}
        onRename={onRenameDocument}
        onPointerDownItem={onPointerDownDocument}
        onPointerEnterItem={onPointerEnterDocument}
        onPointerLeaveItem={onPointerLeaveDocument}
      />

      {activeDoc && image && canvasDocument ? (
        isStudio ? (
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
              <StudioCanvas
                preset={preset}
                image={image}
                onExportHandleChange={onExportHandleChange}
                onPresetChange={onPresetChange}
              />
            </div>
          </div>
        ) : (
          <QuickAccessCanvasArea
            image={image}
            canvasDocument={canvasDocument}
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
            onCanvasDocumentChange={onCanvasDocumentChange}
            onCommitCrop={onCommitCrop}
            onCancelCrop={onCancelCrop}
          />
        )
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
