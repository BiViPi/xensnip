import type { MutableRefObject } from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useQuickAccessSessionController } from '../useQuickAccessSessionController';
import type {
  DocumentUndoSnapshot,
  ScreenshotDocument,
} from '../../editor/useScreenshotDocuments';
import {
  createAnnotationSnapshot,
  createMockImage,
  createScreenshotDocument,
} from '../../test/builders/screenshotDocument';

// Mock generateThumbnail
vi.mock('../../editor/generateThumbnail', () => ({
  generateThumbnail: vi.fn(() => Promise.resolve('data:thumb')),
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
      image: null,
      cropBounds: null,
      setImage: vi.fn<SessionControllerDeps['setImage']>(),
      setCropBounds: vi.fn<SessionControllerDeps['setCropBounds']>(),
      undoStackRef: createRef<DocumentUndoSnapshot[]>([]),
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
    });
    deps.docsRef.current = [doc2];
    deps.activeIdRef.current = '1';
    
    const { result } = renderHook(() => useQuickAccessSessionController(deps));

    act(() => {
      result.current.handleSwitchDocument('2');
    });

    expect(deps.switchToDocument).toHaveBeenCalled();
    expect(deps.setImage).toHaveBeenCalledWith(doc2.image);
    expect(deps.setCropBounds).toHaveBeenCalledWith(null);
  });

  it('should handle document deletion correctly', () => {
    const deps = createMockDeps();
    const removedDoc = createScreenshotDocument('1');
    vi.mocked(deps.removeDocument).mockReturnValue({
      removed: removedDoc,
      nextActiveId: null,
      remainingDocs: []
    });

    const { result } = renderHook(() => useQuickAccessSessionController(deps));

    act(() => {
      result.current.handleDeleteDocument('1');
    });

    expect(deps.removeDocument).toHaveBeenCalledWith('1');
    expect(deps.releaseDocument).toHaveBeenCalledWith(removedDoc);
    expect(deps.setImage).toHaveBeenCalledWith(null);
  });

  it('should clear all in session', () => {
    const deps = createMockDeps();
    const doc1 = createScreenshotDocument('1');
    deps.documents = [doc1];
    
    const { result } = renderHook(() => useQuickAccessSessionController(deps));

    act(() => {
      result.current.handleClearAllInSession();
    });

    expect(deps.patchDocument).toHaveBeenCalledWith('1', expect.objectContaining({
      cropBounds: null,
      undoStack: []
    }));
  });
});
