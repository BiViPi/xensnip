import { useState, useCallback, useRef } from 'react';
import { AnnotationSnapshot } from '../annotate/state/store';
import { CropBounds } from './useCropTool';

/**
 * Document-scoped undo snapshot.
 * Excludes shared preset (which is global/session-scoped).
 */
export interface DocumentUndoSnapshot {
  imageSrc: string;
  annotation: AnnotationSnapshot;
  cropBounds: CropBounds | null;
}

/**
 * Canonical per-document state container.
 */
export interface ScreenshotDocument {
  id: string;
  image: HTMLImageElement;
  blobUrl: string;
  assetId?: string;
  thumbnailSrc: string;
  annotation: AnnotationSnapshot;
  cropBounds: CropBounds | null;
  isExportChecked: boolean;
  undoStack: DocumentUndoSnapshot[];
  createdAt: number;
}

/**
 * Snapshot of the editor state passed during a switch transaction.
 */
export interface DocumentStateSnapshot {
  annotation: AnnotationSnapshot;
  cropBounds: CropBounds | null;
  undoStack: DocumentUndoSnapshot[];
  image?: HTMLImageElement; // Added to support persisting image changes (crops)
}

export function useScreenshotDocuments() {
  const [documents, setDocuments] = useState<ScreenshotDocument[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // Use refs to track latest state for synchronous metadata calculation
  const docsRef = useRef<ScreenshotDocument[]>([]);
  docsRef.current = documents;
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeDocumentId;

  const activeDoc = documents.find((d) => d.id === activeDocumentId) || null;

  /**
   * Adds a new document to the top of the list.
   * Enforces a 20-item cache limit.
   * Returns evicted documents for cleanup.
   */
  const addDocument = useCallback((doc: ScreenshotDocument) => {
    const prev = docsRef.current;
    let next = [doc, ...prev];
    let evicted: ScreenshotDocument[] = [];

    if (next.length > 20) {
      const uncheckedIndices = next
        .map((d, i) => (!d.isExportChecked ? i : -1))
        .filter((i) => i !== -1);

      let indexToRemove = -1;
      if (uncheckedIndices.length > 0) {
        indexToRemove = uncheckedIndices[uncheckedIndices.length - 1];
      } else {
        indexToRemove = next.length - 1;
      }

      if (indexToRemove !== -1) {
        evicted = [next[indexToRemove]];
        next = next.filter((_, i) => i !== indexToRemove);
      }
    }

    setDocuments(next);
    return evicted;
  }, []);

  const removeDocument = useCallback((id: string) => {
    const prev = docsRef.current;
    const target = prev.find((d) => d.id === id);
    if (target) {
      setDocuments(prev.filter((d) => d.id !== id));
      return target;
    }
    return null;
  }, []);

  /**
   * Explicit switch transaction.
   * Persists current editor state into the departing document before switching.
   */
  const switchToDocument = useCallback((nextId: string, currentSnapshot: DocumentStateSnapshot) => {
    const activeId = activeIdRef.current;
    setDocuments((prev) => 
      prev.map((doc) => 
        doc.id === activeId 
          ? { 
              ...doc, 
              annotation: { ...currentSnapshot.annotation }, 
              cropBounds: currentSnapshot.cropBounds,
              undoStack: [...currentSnapshot.undoStack],
              image: currentSnapshot.image || doc.image, // Persist image if provided
            } 
          : doc
      )
    );
    setActiveDocumentId(nextId);
  }, []);

  const updateCheckbox = useCallback((id: string, checked: boolean) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, isExportChecked: checked } : doc))
    );
  }, []);

  const patchActiveDocument = useCallback((patch: Partial<ScreenshotDocument>) => {
    const activeId = activeIdRef.current;
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === activeId ? { ...doc, ...patch } : doc))
    );
  }, []);

  const clearAll = useCallback(() => {
    const all = [...docsRef.current];
    setDocuments([]);
    setActiveDocumentId(null);
    return all;
  }, []);

  return {
    documents,
    activeDocumentId,
    activeDoc,
    addDocument,
    removeDocument,
    switchToDocument,
    updateCheckbox,
    patchActiveDocument,
    clearAll,
    setActiveDocumentId,
  };
}
