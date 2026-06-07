import type { MutableRefObject } from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useQuickAccessSessionController } from '../useQuickAccessSessionController';
import type {
  DocumentUndoSnapshot,
  ScreenshotDocument,
} from '../../editor/useScreenshotDocuments';
import { DEFAULT_PRESET } from '../../compose/preset';
import {
  createAnnotationSnapshot,
  createMockImage,
  createScreenshotDocument,
} from '../../test/builders/screenshotDocument';

// Mock generateThumbnail
vi.mock('../../editor/generateThumbnail', () => ({
  generateThumbnail: vi.fn(() => Promise.resolve('data:thumb')),
  generateDocumentThumbnail: vi.fn(() => Promise.resolve('data:thumb')),
}));

describe('useQuickAccessSessionController', () => {
  const createRef = <T,>(current: T): MutableRefObject<T> => ({ current });

  const createMockDeps = (): Parameters<typeof useQuickAccessSessionController>[0] => {
    type SessionControllerDeps = Parameters<typeof useQuickAccessSessionController>[0];

    return {
      documents: [],
      docsRef: createRef<ScreenshotDocument[]>([]),
      activeIdRef: createRef<string | null>(null),
      switchToDocument: vi.fn<SessionControllerDeps['switchToDocument']>(),
      removeDocument: vi.fn<SessionControllerDeps['removeDocument']>(),
      patchDocument: vi.fn<SessionControllerDeps['patchDocument']>(),
      preset: { ...DEFAULT_PRESET },
      image: null,
      cropBounds: null,
      setPreset: vi.fn<SessionControllerDeps['setPreset']>(),
      setImage: vi.fn<SessionControllerDeps['setImage']>(),
      setCropBounds: vi.fn<SessionControllerDeps['setCropBounds']>(),
      undoStackRef: createRef<DocumentUndoSnapshot[]>([]),
      redoStackRef: createRef<DocumentUndoSnapshot[]>([]),
      activeTool: 'select',
      cancelCrop: vi.fn<SessionControllerDeps['cancelCrop']>(),
      releaseDocument: vi.fn<SessionControllerDeps['releaseDocument']>(),
    };
  };

  it('should handle document switch correctly', () => {
    const deps = createMockDeps();
    const doc2 = createScreenshotDocument('2', {
      image: createMockImage('img2'),
      annotation: createAnnotationSnapshot(),
      cropBounds: null,
      undoStack: [],
      redoStack: [],
    });
    deps.docsRef.current = [doc2];
    deps.activeIdRef.current = '1';
    
    const { result } = renderHook(() => useQuickAccessSessionController(deps));

    act(() => {
      result.current.handleSwitchDocument('2');
    });

    expect(deps.switchToDocument).toHaveBeenCalled();
    expect(deps.setPreset).toHaveBeenCalledWith(doc2.preset);
    expect(deps.setImage).toHaveBeenCalledWith(doc2.image);
    expect(deps.setCropBounds).toHaveBeenCalledWith(null);
  });

  it('should handle document deletion correctly', () => {
    const deps = createMockDeps();
    const removedDoc = createScreenshotDocument('1');
    const nextDoc = createScreenshotDocument('2');
    vi.mocked(deps.removeDocument).mockReturnValue({
      removed: removedDoc,
      nextActiveId: '2',
      remainingDocs: [nextDoc]
    });

    const { result } = renderHook(() => useQuickAccessSessionController(deps));

    act(() => {
      result.current.handleDeleteDocument('1');
    });

    expect(deps.removeDocument).toHaveBeenCalledWith('1');
    expect(deps.releaseDocument).toHaveBeenCalledWith(removedDoc);
    expect(deps.setPreset).toHaveBeenCalledWith(nextDoc.preset);
    expect(deps.setImage).toHaveBeenCalledWith(nextDoc.image);
  });

  it('should clear all in session', () => {
    const deps = createMockDeps();
    const doc1 = createScreenshotDocument('1');
    deps.documents = [doc1];
    deps.undoStackRef.current = [
      { imageSrc: 'undo', annotation: createAnnotationSnapshot(), cropBounds: null },
    ];
    deps.redoStackRef.current = [
      { imageSrc: 'redo', annotation: createAnnotationSnapshot(), cropBounds: null },
    ];
    
    const { result } = renderHook(() => useQuickAccessSessionController(deps));

    act(() => {
      result.current.handleClearAllInSession();
    });

    expect(deps.patchDocument).toHaveBeenCalledWith('1', expect.objectContaining({
      cropBounds: null,
      undoStack: [],
      redoStack: []
    }));
    expect(deps.undoStackRef.current).toEqual([]);
    expect(deps.redoStackRef.current).toEqual([]);
  });
});
