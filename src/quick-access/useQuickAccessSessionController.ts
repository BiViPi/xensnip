import { useCallback } from "react";
import { useAnnotationStore } from "../annotate/state/store";
import { generateThumbnail } from "../editor/generateThumbnail";
import {
  DocumentStateSnapshot,
  DocumentUndoSnapshot,
  ScreenshotDocument,
} from "../editor/useScreenshotDocuments";
import { CropBounds } from "../editor/useCropTool";

interface SessionControllerInput {
  // document state
  documents: ScreenshotDocument[];
  docsRef: React.MutableRefObject<ScreenshotDocument[]>;
  activeIdRef: React.MutableRefObject<string | null>;
  switchToDocument: (id: string, snapshot: DocumentStateSnapshot) => void;
  removeDocument: (id: string) => { removed: ScreenshotDocument; nextActiveId: string | null; remainingDocs: ScreenshotDocument[] } | null;
  patchDocument: (id: string, patch: Partial<ScreenshotDocument>) => void;

  // editor shell state
  image: HTMLImageElement | null;
  cropBounds: CropBounds | null;
  setImage: (img: HTMLImageElement | null) => void;
  setCropBounds: (bounds: CropBounds | null) => void;

  // undo stack — shared ref from useEditorUndoStack; mutated directly
  undoStackRef: React.MutableRefObject<DocumentUndoSnapshot[]>;

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
    image,
    cropBounds,
    setImage,
    setCropBounds,
    undoStackRef,
    activeTool,
    cancelCrop,
    releaseDocument,
  } = deps;

  const flushActiveDocument = useCallback(() => {
    const activeId = activeIdRef.current;
    if (!activeId) return;
    const s = useAnnotationStore.getState();
    const snap: DocumentStateSnapshot = {
      annotation: {
        activeTool: s.activeTool,
        objects: s.objects.map((obj) => ({ ...obj })),
        selectedId: s.selectedId,
        editingTextId: s.editingTextId,
        toolbarCollapsed: s.toolbarCollapsed,
      },
      cropBounds: cropBounds ? { ...cropBounds } : null,
      undoStack: [...undoStackRef.current],
      image: image || undefined,
    };
    switchToDocument(activeId, snap);
  }, [activeIdRef, cropBounds, image, switchToDocument, undoStackRef]);

  const handleSwitchDocument = useCallback(
    (nextId: string) => {
      const activeId = activeIdRef.current;
      if (nextId === activeId) return;

      if (activeTool === "crop") cancelCrop();

      const annotationState = useAnnotationStore.getState();
      const snapshot: DocumentStateSnapshot = {
        annotation: {
          activeTool: annotationState.activeTool,
          objects: annotationState.objects.map((obj) => ({ ...obj })),
          selectedId: annotationState.selectedId,
          editingTextId: annotationState.editingTextId,
          toolbarCollapsed: annotationState.toolbarCollapsed,
        },
        cropBounds: cropBounds ?? null,
        undoStack: [...undoStackRef.current],
        image: image ?? undefined,
      };

      switchToDocument(nextId, snapshot);

      const nextDoc = docsRef.current.find((d) => d.id === nextId);
      if (!nextDoc) return;
      setImage(nextDoc.image);
      useAnnotationStore.getState().restoreSnapshot(nextDoc.annotation);
      setCropBounds(nextDoc.cropBounds);
      undoStackRef.current = [...nextDoc.undoStack];
    },
    [
      activeIdRef,
      activeTool,
      cancelCrop,
      cropBounds,
      docsRef,
      image,
      setCropBounds,
      setImage,
      switchToDocument,
      undoStackRef,
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
          setImage(nextDoc.image);
          useAnnotationStore.getState().restoreSnapshot(nextDoc.annotation);
          setCropBounds(nextDoc.cropBounds);
          undoStackRef.current = [...nextDoc.undoStack];
        }
      } else if (remainingDocs.length === 0) {
        setImage(null);
        useAnnotationStore.getState().clearAll();
        setCropBounds(null);
        undoStackRef.current = [];
      }
    },
    [removeDocument, releaseDocument, setImage, setCropBounds, undoStackRef]
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
          selectedId: null,
          editingTextId: null,
        },
        cropBounds: null,
        undoStack: [],
      });
      void generateThumbnail(doc.image).then((thumb) => {
        patchDocument(doc.id, { thumbnailSrc: thumb });
      });
    });
  }, [documents, patchDocument]);

  return {
    flushActiveDocument,
    handleSwitchDocument,
    handleDeleteDocument,
    handleClearAllInSession,
  };
}
