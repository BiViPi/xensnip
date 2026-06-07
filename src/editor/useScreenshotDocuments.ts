import { useState, useCallback, useRef } from 'react';
import { AnnotationSnapshot } from '../annotate/state/store';
import { CropBounds } from './useCropTool';
import type { EditorPreset } from '../compose/preset';
import { addCanvasImageObject, type CanvasDocument } from './canvasDocument';

/**
 * Document-scoped undo snapshot.
 * Excludes shared preset (which is global/session-scoped).
 */
export interface DocumentUndoSnapshot {
  imageSrc: string;
  image?: HTMLImageElement;
  canvas?: CanvasDocument;
  annotation: AnnotationSnapshot;
  cropBounds: CropBounds | null;
}

/**
 * Canonical per-document state container.
 */
export interface ScreenshotDocument {
  id: string;
  image: HTMLImageElement;
  canvas: CanvasDocument;
  blobUrl: string;
  assetId?: string;
  thumbnailSrc: string;
  filename?: string;
  preset: EditorPreset;
  annotation: AnnotationSnapshot;
  cropBounds: CropBounds | null;
  isExportChecked: boolean;
  undoStack: DocumentUndoSnapshot[];
  redoStack: DocumentUndoSnapshot[];
  createdAt: number;
}

/**
 * Snapshot of the editor state passed during a switch transaction.
 */
export interface DocumentStateSnapshot {
  preset: EditorPreset;
  annotation: AnnotationSnapshot;
  cropBounds: CropBounds | null;
  undoStack: DocumentUndoSnapshot[];
  redoStack: DocumentUndoSnapshot[];
  image?: HTMLImageElement; // Added to support persisting image changes (crops)
  canvas?: CanvasDocument;
}

export type MergeDocumentsFailureReason =
  | 'missing_document'
  | 'same_document'
  | 'target_full'
  | 'source_not_single_image'
  | 'source_has_annotations'
  | 'source_crop_pending'
  | 'target_crop_pending';

export type MergeDocumentsResult =
  | {
      ok: true;
      sourceId: string;
      targetId: string;
      nextActiveId: string | null;
      mergedDocument: ScreenshotDocument;
      removedDocument: ScreenshotDocument;
      remainingDocs: ScreenshotDocument[];
    }
  | {
      ok: false;
      reason: MergeDocumentsFailureReason;
    };

function isSingleImageDocument(doc: ScreenshotDocument): boolean {
  return doc.canvas.images.length <= 1;
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
        .map((d, i) => (!d.isExportChecked && isSingleImageDocument(d) ? i : -1))
        .filter((i) => i !== -1);
      const singleImageIndices = next
        .map((d, i) => (isSingleImageDocument(d) ? i : -1))
        .filter((i) => i !== -1);

      let indexToRemove = -1;
      if (uncheckedIndices.length > 0) {
        indexToRemove = uncheckedIndices[uncheckedIndices.length - 1];
      } else if (singleImageIndices.length > 0) {
        indexToRemove = singleImageIndices[singleImageIndices.length - 1];
      }

      if (indexToRemove !== -1) {
        evicted = [next[indexToRemove]];
        next = next.filter((_, i) => i !== indexToRemove);
      }
    }

    docsRef.current = next;
    setDocuments(next);
    return evicted;
  }, []);

  const removeDocument = useCallback((id: string) => {
    const prev = docsRef.current;
    const activeId = activeIdRef.current;
    const target = prev.find((d) => d.id === id);
    
    if (target) {
      const nextDocs = prev.filter((d) => d.id !== id);
      docsRef.current = nextDocs;
      setDocuments(nextDocs);
      
      let nextActiveId = activeId;
      if (activeId === id) {
        nextActiveId = nextDocs.length > 0 ? nextDocs[0].id : null;
        activeIdRef.current = nextActiveId;
        setActiveDocumentId(nextActiveId);
      }
      
      return { removed: target, nextActiveId, remainingDocs: nextDocs };
    }
    return null;
  }, []);

  /**
   * Explicit switch transaction.
   * Persists current editor state into the departing document before switching.
   */
  const switchToDocument = useCallback((nextId: string, currentSnapshot: DocumentStateSnapshot) => {
    const activeId = activeIdRef.current;
    const nextDocs = docsRef.current.map((doc) =>
      doc.id === activeId
        ? {
            ...doc,
            preset: { ...currentSnapshot.preset },
            annotation: { ...currentSnapshot.annotation },
            cropBounds: currentSnapshot.cropBounds,
            undoStack: [...currentSnapshot.undoStack],
            redoStack: [...currentSnapshot.redoStack],
            image: currentSnapshot.image || doc.image,
            canvas: currentSnapshot.canvas || doc.canvas,
          }
        : doc
    );
    docsRef.current = nextDocs;
    activeIdRef.current = nextId;
    setDocuments(nextDocs);
    setActiveDocumentId(nextId);
  }, []);

  const updateCheckbox = useCallback((id: string, checked: boolean) => {
    const nextDocs = docsRef.current.map((doc) =>
      doc.id === id ? { ...doc, isExportChecked: checked } : doc
    );
    docsRef.current = nextDocs;
    setDocuments(nextDocs);
  }, []);

  const patchActiveDocument = useCallback((patch: Partial<ScreenshotDocument>) => {
    const activeId = activeIdRef.current;
    const nextDocs = docsRef.current.map((doc) =>
      doc.id === activeId ? { ...doc, ...patch } : doc
    );
    docsRef.current = nextDocs;
    setDocuments(nextDocs);
  }, []);

  const patchDocument = useCallback((id: string, patch: Partial<ScreenshotDocument>) => {
    const nextDocs = docsRef.current.map((doc) =>
      doc.id === id ? { ...doc, ...patch } : doc
    );
    docsRef.current = nextDocs;
    setDocuments(nextDocs);
  }, []);

  const clearAll = useCallback(() => {
    const all = [...docsRef.current];
    docsRef.current = [];
    activeIdRef.current = null;
    setDocuments([]);
    setActiveDocumentId(null);
    return all;
  }, []);

  const getMergeFailureReason = useCallback((
    sourceId: string,
    targetId: string
  ): MergeDocumentsFailureReason | null => {
    if (sourceId === targetId) {
      return 'same_document';
    }

    const prev = docsRef.current;
    const sourceDoc = prev.find((doc) => doc.id === sourceId);
    const targetDoc = prev.find((doc) => doc.id === targetId);
    if (!sourceDoc || !targetDoc) {
      return 'missing_document';
    }
    if (targetDoc.canvas.images.length >= targetDoc.canvas.maxImages) {
      return 'target_full';
    }
    if (sourceDoc.canvas.images.length !== 1) {
      return 'source_not_single_image';
    }
    if (sourceDoc.annotation.objects.length > 0) {
      return 'source_has_annotations';
    }
    if (sourceDoc.cropBounds) {
      return 'source_crop_pending';
    }
    if (targetDoc.cropBounds) {
      return 'target_crop_pending';
    }
    return null;
  }, []);

  const mergeDocuments = useCallback((sourceId: string, targetId: string): MergeDocumentsResult => {
    const failureReason = getMergeFailureReason(sourceId, targetId);
    if (failureReason) {
      return { ok: false, reason: failureReason };
    }

    const prev = docsRef.current;
    const sourceDoc = prev.find((doc) => doc.id === sourceId)!;
    const targetDoc = prev.find((doc) => doc.id === targetId)!;
    const sourceImage = sourceDoc.canvas.images[0];
    const mergedCanvas = addCanvasImageObject(targetDoc.canvas, sourceImage);
    const mergedPreset =
      targetDoc.preset.presentation_mode === 'studio'
        ? { ...targetDoc.preset, presentation_mode: 'flat' as const }
        : targetDoc.preset;
    const mergedDocument: ScreenshotDocument = {
      ...targetDoc,
      canvas: mergedCanvas,
      image: sourceImage.image,
      blobUrl: sourceImage.blobUrl,
      assetId: undefined,
      preset: mergedPreset,
    };
    const remainingDocs = prev
      .filter((doc) => doc.id !== sourceId)
      .map((doc) => (doc.id === targetId ? mergedDocument : doc));

    const currentActiveId = activeIdRef.current;
    const nextActiveId =
      currentActiveId === sourceId || currentActiveId === targetId
        ? targetId
        : currentActiveId;

    docsRef.current = remainingDocs;
    activeIdRef.current = nextActiveId;
    setDocuments(remainingDocs);
    setActiveDocumentId(nextActiveId);

    return {
      ok: true,
      sourceId,
      targetId,
      nextActiveId,
      mergedDocument,
      removedDocument: sourceDoc,
      remainingDocs,
    };
  }, [getMergeFailureReason]);

  return {
    documents,
    activeDocumentId,
    activeDoc,
    addDocument,
    removeDocument,
    switchToDocument,
    updateCheckbox,
    patchActiveDocument,
    patchDocument,
    clearAll,
    getMergeFailureReason,
    mergeDocuments,
    setActiveDocumentId,
    docsRef,
    activeIdRef
  };
}
