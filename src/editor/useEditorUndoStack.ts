import { useCallback, useRef } from "react";
import { useAnnotationStore } from "../annotate/state/store";
import { withHistorySuspended } from "./historyBridge";
import { DocumentUndoSnapshot } from "./useScreenshotDocuments";
import { CropBounds } from "./useCropTool";
import { CanvasDocument, cloneCanvasDocument, getSelectedCanvasImage } from "./canvasDocument";

const HISTORY_LIMIT = 50;

function buildCanvasSignature(canvasDocument: CanvasDocument | null): string | null {
  if (!canvasDocument) return null;
  return JSON.stringify({
    selectedImageId: canvasDocument.selectedImageId,
    maxImages: canvasDocument.maxImages,
    images: canvasDocument.images.map((image) => ({
      id: image.id,
      assetId: image.assetId ?? null,
      blobUrl: image.blobUrl,
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height,
      rotation: image.rotation,
      sourceCrop: image.sourceCrop,
    })),
  });
}

interface UseEditorUndoStackDeps {
  image: HTMLImageElement | null;
  canvasDocument: CanvasDocument | null;
  cropBounds: CropBounds | null;
  setImage: (img: HTMLImageElement) => void;
  setCanvasDocument: (canvasDocument: CanvasDocument) => void;
  setCropBounds: (b: CropBounds | null) => void;
}

export function useEditorUndoStack({
  image,
  canvasDocument,
  cropBounds,
  setImage,
  setCanvasDocument,
  setCropBounds,
}: UseEditorUndoStackDeps): {
  pushHistorySnapshot: () => void;
  handleUndo: () => Promise<void>;
  handleRedo: () => Promise<void>;
  undoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;
  redoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;
} {
  const undoStackRef = useRef<DocumentUndoSnapshot[]>([]);
  const redoStackRef = useRef<DocumentUndoSnapshot[]>([]);

  const buildAnnotationSnapshot = useCallback(() => {
    const s = useAnnotationStore.getState();
    return {
      activeTool: s.activeTool,
      objects: s.objects.map((obj) => ({ ...obj })),
      selectedIds: s.selectedIds,
      editingTextId: s.editingTextId,
      toolbarCollapsed: s.toolbarCollapsed,
    };
  }, []);

  const buildSnapshot = useCallback((): DocumentUndoSnapshot | null => {
    if (!image?.src) return null;
    return {
      image,
      imageSrc: image.src,
      canvas: canvasDocument ? cloneCanvasDocument(canvasDocument) : undefined,
      annotation: buildAnnotationSnapshot(),
      cropBounds: cropBounds ? { ...cropBounds } : null,
    };
  }, [canvasDocument, cropBounds, image, buildAnnotationSnapshot]);

  const loadSnapshotImage = useCallback(async (src: string) => {
    const img = new Image();
    img.src = src;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to restore snapshot image"));
    });
    return img;
  }, []);

  const restoreSnapshotImage = useCallback(
    async (snapshot: DocumentUndoSnapshot) => {
      if (snapshot.image?.src === snapshot.imageSrc) {
        return snapshot.image;
      }
      return loadSnapshotImage(snapshot.imageSrc);
    },
    [loadSnapshotImage]
  );

  const pushHistorySnapshot = useCallback(() => {
    const snapshot = buildSnapshot();
    if (!snapshot) return;

    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    const previousCanvasSignature = buildCanvasSignature(previous?.canvas ?? null);
    const nextCanvasSignature = buildCanvasSignature(snapshot.canvas ?? null);
    if (
      previous &&
      previous.imageSrc === snapshot.imageSrc &&
      previousCanvasSignature === nextCanvasSignature &&
      JSON.stringify(previous.annotation) === JSON.stringify(snapshot.annotation) &&
      JSON.stringify(previous.cropBounds) === JSON.stringify(snapshot.cropBounds)
    ) {
      return;
    }

    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > HISTORY_LIMIT) {
      undoStackRef.current.shift();
    }
    // New action invalidates the redo future
    redoStackRef.current = [];
  }, [buildSnapshot]);

  const handleUndo = useCallback(async () => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;

    // Capture current state to redo stack before applying undo
    const currentSnapshot = buildSnapshot();
    if (currentSnapshot) {
      redoStackRef.current.push(currentSnapshot);
      if (redoStackRef.current.length > HISTORY_LIMIT) {
        redoStackRef.current.shift();
      }
    }

    try {
      const restoredImage = await restoreSnapshotImage(snapshot);
      withHistorySuspended(() => {
        if (snapshot.canvas) {
          setCanvasDocument(snapshot.canvas);
          const selectedImage = getSelectedCanvasImage(snapshot.canvas);
          if (selectedImage?.image) {
            setImage(selectedImage.image);
          } else {
            setImage(restoredImage);
          }
        } else {
          setImage(restoredImage);
        }
        // Shared preset is intentionally excluded from per-document undo
        useAnnotationStore.getState().restoreSnapshot(snapshot.annotation);
        setCropBounds(snapshot.cropBounds ? { ...snapshot.cropBounds } : null);
      });
    } catch (error) {
      console.error("Undo restore failed", error);
      // Rollback stacks
      undoStackRef.current.push(snapshot);
      redoStackRef.current.pop();
    }
  }, [buildSnapshot, restoreSnapshotImage, setCanvasDocument, setImage, setCropBounds]);

  const handleRedo = useCallback(async () => {
    const snapshot = redoStackRef.current.pop();
    if (!snapshot) return;

    // Capture current state to undo stack before applying redo
    const currentSnapshot = buildSnapshot();
    if (currentSnapshot) {
      undoStackRef.current.push(currentSnapshot);
      if (undoStackRef.current.length > HISTORY_LIMIT) {
        undoStackRef.current.shift();
      }
    }

    try {
      const restoredImage = await restoreSnapshotImage(snapshot);
      withHistorySuspended(() => {
        if (snapshot.canvas) {
          setCanvasDocument(snapshot.canvas);
          const selectedImage = getSelectedCanvasImage(snapshot.canvas);
          if (selectedImage?.image) {
            setImage(selectedImage.image);
          } else {
            setImage(restoredImage);
          }
        } else {
          setImage(restoredImage);
        }
        useAnnotationStore.getState().restoreSnapshot(snapshot.annotation);
        setCropBounds(snapshot.cropBounds ? { ...snapshot.cropBounds } : null);
      });
    } catch (error) {
      console.error("Redo restore failed", error);
      // Rollback stacks
      redoStackRef.current.push(snapshot);
      undoStackRef.current.pop();
    }
  }, [buildSnapshot, restoreSnapshotImage, setCanvasDocument, setImage, setCropBounds]);

  return { pushHistorySnapshot, handleUndo, handleRedo, undoStackRef, redoStackRef };
}
