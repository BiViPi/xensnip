import { useCallback } from "react";
import { useAnnotationStore } from "../annotate/state/store";
import { generateDocumentThumbnail } from "../editor/generateThumbnail";
import type { EditorPreset } from "../compose/preset";
import {
  DocumentStateSnapshot,
  DocumentUndoSnapshot,
  ScreenshotDocument,
} from "../editor/useScreenshotDocuments";
import { CropBounds } from "../editor/useCropTool";
import { getSelectedCanvasImage } from "../editor/canvasDocument";

interface SessionControllerInput {
  // document state
  documents: ScreenshotDocument[];
  docsRef: React.MutableRefObject<ScreenshotDocument[]>;
  activeIdRef: React.MutableRefObject<string | null>;
  switchToDocument: (id: string, snapshot: DocumentStateSnapshot) => void;
  removeDocument: (id: string) => { removed: ScreenshotDocument; nextActiveId: string | null; remainingDocs: ScreenshotDocument[] } | null;
  patchDocument: (id: string, patch: Partial<ScreenshotDocument>) => void;

  // editor shell state
  preset: EditorPreset;
  image: HTMLImageElement | null;
  cropBounds: CropBounds | null;
  setPreset: (preset: EditorPreset) => void;
  setImage: (img: HTMLImageElement | null) => void;
  setCropBounds: (bounds: CropBounds | null) => void;

  // undo stack — shared ref from useEditorUndoStack; mutated directly
  undoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;
  redoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;

  // crop flow — needed to cancel active crop before a document switch
  activeTool: string;
  cancelCrop: () => void;

  // asset lifecycle — shell-owned, injected for delete flows only
  releaseDocument: (doc: ScreenshotDocument) => void;
}

export interface QuickAccessSessionController {
  flushActiveDocument: () => void;
  handleSwitchDocument: (nextId: string) => void;
  handleDeleteDocument: (id: string) => void;
  handleClearAllInSession: () => void;
}

export function useQuickAccessSessionController(
  deps: SessionControllerInput
): QuickAccessSessionController {
  const {
    documents,
    docsRef,
    activeIdRef,
    switchToDocument,
    removeDocument,
    patchDocument,
    preset,
    image,
    cropBounds,
    setPreset,
    setImage,
    setCropBounds,
    undoStackRef,
    redoStackRef,
    activeTool,
    cancelCrop,
    releaseDocument,
  } = deps;

  const flushActiveDocument = useCallback(() => {
    const activeId = activeIdRef.current;
    if (!activeId) return;
    const s = useAnnotationStore.getState();
    const snap: DocumentStateSnapshot = {
      preset: { ...preset },
      annotation: {
        activeTool: s.activeTool,
        objects: s.objects.map((obj) => ({ ...obj })),
        selectedIds: s.selectedIds,
        editingTextId: s.editingTextId,
        toolbarCollapsed: s.toolbarCollapsed,
      },
      cropBounds: cropBounds ? { ...cropBounds } : null,
      undoStack: [...undoStackRef.current],
      redoStack: [...redoStackRef.current],
      image: image || undefined,
      canvas: docsRef.current.find((doc) => doc.id === activeId)?.canvas,
    };
    switchToDocument(activeId, snap);
  }, [activeIdRef, cropBounds, image, preset, switchToDocument, undoStackRef, redoStackRef]);

  const handleSwitchDocument = useCallback(
    (nextId: string) => {
      const activeId = activeIdRef.current;
      if (nextId === activeId) return;

      if (activeTool === "crop") cancelCrop();

      const annotationState = useAnnotationStore.getState();
      const snapshot: DocumentStateSnapshot = {
        preset: { ...preset },
        annotation: {
          activeTool: annotationState.activeTool,
          objects: annotationState.objects.map((obj) => ({ ...obj })),
          selectedIds: annotationState.selectedIds,
          editingTextId: annotationState.editingTextId,
          toolbarCollapsed: annotationState.toolbarCollapsed,
        },
        cropBounds: cropBounds ?? null,
        undoStack: [...undoStackRef.current],
        redoStack: [...redoStackRef.current],
        image: image ?? undefined,
        canvas: docsRef.current.find((doc) => doc.id === activeId)?.canvas,
      };

      switchToDocument(nextId, snapshot);

      const nextDoc = docsRef.current.find((d) => d.id === nextId);
      if (!nextDoc) return;
      setPreset(nextDoc.preset);
      setImage(getSelectedCanvasImage(nextDoc.canvas)?.image ?? nextDoc.image);
      useAnnotationStore.getState().restoreSnapshot(nextDoc.annotation);
      setCropBounds(nextDoc.cropBounds);
      undoStackRef.current = [...nextDoc.undoStack];
      redoStackRef.current = [...nextDoc.redoStack];
    },
    [
      activeIdRef,
      activeTool,
      cancelCrop,
      cropBounds,
      docsRef,
      image,
      preset,
      setCropBounds,
      setImage,
      setPreset,
      switchToDocument,
      undoStackRef,
      redoStackRef,
    ]
  );

  const handleDeleteDocument = useCallback(
    (id: string) => {
      const result = removeDocument(id);
      if (!result) return;

      const { removed, nextActiveId, remainingDocs } = result;
      releaseDocument(removed);

      if (nextActiveId) {
        const nextDoc = remainingDocs.find((d) => d.id === nextActiveId);
        if (nextDoc) {
          setPreset(nextDoc.preset);
          setImage(getSelectedCanvasImage(nextDoc.canvas)?.image ?? nextDoc.image);
          useAnnotationStore.getState().restoreSnapshot(nextDoc.annotation);
          setCropBounds(nextDoc.cropBounds);
          undoStackRef.current = [...nextDoc.undoStack];
          redoStackRef.current = [...nextDoc.redoStack];
        }
      } else if (remainingDocs.length === 0) {
        setImage(null);
        useAnnotationStore.getState().clearAll();
        setCropBounds(null);
        undoStackRef.current = [];
        redoStackRef.current = [];
      }
    },
    [removeDocument, releaseDocument, setCropBounds, setImage, setPreset, undoStackRef, redoStackRef]
  );

  const handleClearAllInSession = useCallback(() => {
    // Snapshot the document list at call time; fire-and-forget thumbnail
    // patches are harmless if the session is cleared before they resolve.
    const snapshot = [...documents];
    snapshot.forEach((doc) => {
      patchDocument(doc.id, {
        annotation: {
          ...doc.annotation,
          objects: [],
          selectedIds: [],
          editingTextId: null,
        },
        cropBounds: null,
        undoStack: [],
        redoStack: [],
      });
      void generateDocumentThumbnail({
        image: doc.image,
        canvas: doc.canvas,
        preset: doc.preset,
      }).then((thumb) => {
        patchDocument(doc.id, { thumbnailSrc: thumb });
      });
    });
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [documents, patchDocument, undoStackRef, redoStackRef]);

  return {
    flushActiveDocument,
    handleSwitchDocument,
    handleDeleteDocument,
    handleClearAllInSession,
  };
}
