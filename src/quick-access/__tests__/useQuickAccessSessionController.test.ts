import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useQuickAccessSessionController } from '../useQuickAccessSessionController';

// Mock generateThumbnail
vi.mock('../../editor/generateThumbnail', () => ({
  generateThumbnail: vi.fn(() => Promise.resolve('data:thumb')),
}));

describe('useQuickAccessSessionController', () => {
  const createMockDeps = () => ({
    documents: [] as any[],
    docsRef: { current: [] } as any,
    activeIdRef: { current: null } as any,
    switchToDocument: vi.fn(),
    removeDocument: vi.fn(),
    patchDocument: vi.fn(),
    image: null,
    cropBounds: null,
    setImage: vi.fn(),
    setCropBounds: vi.fn(),
    undoStackRef: { current: [] } as any,
    activeTool: 'select',
    cancelCrop: vi.fn(),
    releaseDocument: vi.fn(),
  });

  it('should handle document switch correctly', () => {
    const deps = createMockDeps();
    const doc2 = { 
      id: '2', 
      image: { src: 'img2' } as any, 
      annotation: { objects: [], activeTool: 'select' },
      cropBounds: null,
      undoStack: []
    };
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
    const removedDoc = { id: '1', image: {} } as any;
    deps.removeDocument.mockReturnValue({
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
    const doc1 = { id: '1', image: {} } as any;
    deps.documents = [doc1];
    
    const { result } = renderHook(() => useQuickAccessSessionController(deps));

    act(() => {
      result.current.handleClearAllInSession();
    });

    expect(deps.patchDocument).toHaveBeenCalledWith('1', expect.objectContaining({
      cropBounds: null,
      undoStack: []
    }) as any);
  });
});
