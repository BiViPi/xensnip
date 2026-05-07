import { useCallback, useRef } from "react";
import { useAnnotationStore } from "../annotate/state/store";
import { withHistorySuspended } from "./historyBridge";
import { DocumentUndoSnapshot } from "./useScreenshotDocuments";
import { CropBounds } from "./useCropTool";

const HISTORY_LIMIT = 50;

interface UseEditorUndoStackDeps {
  image: HTMLImageElement | null;
  cropBounds: CropBounds | null;
  setImage: (img: HTMLImageElement) => void;
  setCropBounds: (b: CropBounds | null) => void;
}

export function useEditorUndoStack({
  image,
  cropBounds,
  setImage,
  setCropBounds,
}: UseEditorUndoStackDeps): {
  pushHistorySnapshot: () => void;
  handleUndo: () => Promise<void>;
  undoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;
} {
  const undoStackRef = useRef<DocumentUndoSnapshot[]>([]);

  const buildAnnotationSnapshot = useCallback(() => {
    const s = useAnnotationStore.getState();
    return {
      activeTool: s.activeTool,
      objects: s.objects.map((obj) => ({ ...obj })),
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
  }, [loadSnapshotImage, setImage, setCropBounds]);

  return { pushHistorySnapshot, handleUndo, undoStackRef };
}
