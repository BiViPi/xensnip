import { EditorPreset } from "../compose/preset";
import { ScreenshotDocument } from "../editor/useScreenshotDocuments";
import { QuickBar } from "../editor/QuickBar";
import { Settings } from "../ipc/types";

interface QuickAccessDockProps {
  activeDoc: ScreenshotDocument | null;
  image: HTMLImageElement | null;
  documents: ScreenshotDocument[];
  preset: EditorPreset;
  settings: Settings | null;
  activePop: string | null;
  isActionInFlight: boolean;
  previewViewportCenterOffsetX: number;
  onPresetChange: (preset: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  onActionInFlightChange: (value: boolean) => void;
  onShowToast: (message: string, type?: "success" | "error") => void;
  onActivePopChange: (value: string | null) => void;
  onRefreshSettings: () => void;
  onOpenPresetManager: () => void;
  onClearAllSession: () => void;
  onFlush: () => void;
}

export function QuickAccessDock({
  activeDoc,
  image,
  documents,
  preset,
  settings,
  activePop,
  isActionInFlight,
  previewViewportCenterOffsetX,
  onPresetChange,
  onActionInFlightChange,
  onShowToast,
  onActivePopChange,
  onRefreshSettings,
  onOpenPresetManager,
  onClearAllSession,
  onFlush,
}: QuickAccessDockProps) {
  if (!activeDoc || !image) return null;

  return (
    <div
      className="xs-dock-container"
      style={{ left: `calc(50% + ${previewViewportCenterOffsetX}px)` }}
    >
      <QuickBar
        preset={preset}
        setPreset={onPresetChange}
        image={image}
        isActionInFlight={isActionInFlight}
        setIsActionInFlight={onActionInFlightChange}
        showToast={onShowToast}
        activePop={activePop}
        onActivePopChange={onActivePopChange}
        settings={settings}
        onRefreshSettings={onRefreshSettings}
        onOpenPresetManager={onOpenPresetManager}
        documents={documents}
        activeDocument={activeDoc}
        onClearAllSession={onClearAllSession}
        onFlush={onFlush}
      />
    </div>
  );
}
