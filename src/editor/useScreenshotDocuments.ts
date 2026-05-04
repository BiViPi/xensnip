import { useState, useCallback } from 'react';
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
}

export function useScreenshotDocuments() {
  const [documents, setDocuments] = useState<ScreenshotDocument[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const activeDoc = documents.find((d) => d.id === activeDocumentId) || null;

  /**
   * Adds a new document to the top of the list.
   * Enforces a 20-item cache limit.
   * Returns evicted documents for cleanup (blob URL revocation, asset release).
   */
  const addDocument = useCallback((doc: ScreenshotDocument) => {
    let evicted: ScreenshotDocument[] = [];
    
    setDocuments((prev) => {
      const next = [doc, ...prev];
      if (next.length > 20) {
        // Cache eviction policy: 
        // 1. Try to find the oldest unchecked item
        // 2. If all are checked, remove the oldest item regardless
        const uncheckedIndices = next
          .map((d, i) => (!d.isExportChecked ? i : -1))
          .filter((i) => i !== -1);

        let indexToRemove = -1;
        if (uncheckedIndices.length > 0) {
          // Remove oldest unchecked (last in uncheckedIndices because next is newest-first)
          indexToRemove = uncheckedIndices[uncheckedIndices.length - 1];
        } else {
          // Remove absolute oldest
          indexToRemove = next.length - 1;
        }

        if (indexToRemove !== -1) {
          evicted = [next[indexToRemove]];
          return next.filter((_, i) => i !== indexToRemove);
        }
      }
      return next;
    });

    return evicted;
  }, []);

  const removeDocument = useCallback((id: string) => {
    let removed: ScreenshotDocument | null = null;
    setDocuments((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) {
        removed = target;
        const next = prev.filter((d) => d.id !== id);
        return next;
      }
      return prev;
    });
    return removed;
  }, []);

  /**
   * Explicit switch transaction.
   * Persists current editor state into the departing document before switching.
   */
  const switchToDocument = useCallback((nextId: string, currentSnapshot: DocumentStateSnapshot) => {
    setDocuments((prev) => 
      prev.map((doc) => 
        doc.id === activeDocumentId 
          ? { 
              ...doc, 
              annotation: { ...currentSnapshot.annotation }, 
              cropBounds: currentSnapshot.cropBounds,
              undoStack: [...currentSnapshot.undoStack]
            } 
          : doc
      )
    );
    setActiveDocumentId(nextId);
  }, [activeDocumentId]);

  const updateCheckbox = useCallback((id: string, checked: boolean) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, isExportChecked: checked } : doc))
    );
  }, []);

  const patchActiveDocument = useCallback((patch: Partial<ScreenshotDocument>) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === activeDocumentId ? { ...doc, ...patch } : doc))
    );
  }, [activeDocumentId]);

  const clearAll = useCallback(() => {
    let all: ScreenshotDocument[] = [];
    setDocuments((prev) => {
      all = [...prev];
      return [];
    });
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
    setActiveDocumentId, // sometimes needed for initial set
  };
}
