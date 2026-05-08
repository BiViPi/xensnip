import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useScreenshotDocuments, ScreenshotDocument } from '../useScreenshotDocuments';

// Mock HTMLImageElement
global.HTMLImageElement = class extends HTMLElement {
  constructor() {
    super();
  }
} as any;

const createMockDoc = (id: string): ScreenshotDocument => ({
  id,
  image: new Image(),
  blobUrl: `blob:${id}`,
  thumbnailSrc: `thumb:${id}`,
  annotation: { 
    objects: [], 
    activeTool: 'select', 
    selectedId: null, 
    editingTextId: null, 
    toolbarCollapsed: false 
  },
  cropBounds: null,
  isExportChecked: false,
  undoStack: [],
  createdAt: Date.now(),
});

describe('useScreenshotDocuments', () => {
  it('adds a document while active selection remains caller-owned', () => {
    const { result } = renderHook(() => useScreenshotDocuments());
    const doc = createMockDoc('1');

    act(() => {
      result.current.addDocument(doc);
    });

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.activeDocumentId).toBeNull();

    act(() => {
      result.current.setActiveDocumentId('1');
    });

    expect(result.current.activeDocumentId).toBe('1');
    expect(result.current.activeDoc?.id).toBe('1');
  });

  it('enforces 20-item limit and evicts oldest unchecked', () => {
    const { result } = renderHook(() => useScreenshotDocuments());
    
    for (let i = 1; i <= 20; i++) {
      act(() => {
        result.current.addDocument(createMockDoc(i.toString()));
      });
    }

    expect(result.current.documents).toHaveLength(20);

    act(() => {
      // Add 21st document
      result.current.addDocument(createMockDoc('21'));
    });

    expect(result.current.documents).toHaveLength(20);
    // Document '1' should be evicted because it was the oldest and unchecked
    expect(result.current.documents.find(d => d.id === '1')).toBeUndefined();
    expect(result.current.documents[0].id).toBe('21');
  });

  it('removes a document and updates active ID only when the removed document was active', () => {
    const { result } = renderHook(() => useScreenshotDocuments());
    const doc1 = createMockDoc('1');
    const doc2 = createMockDoc('2');

    act(() => {
      result.current.addDocument(doc1);
    });

    act(() => {
      result.current.addDocument(doc2);
    });

    act(() => {
      result.current.setActiveDocumentId('2');
    });

    act(() => {
      result.current.removeDocument('2');
    });

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.activeDocumentId).toBe('1');
  });

  it('performs switch transaction correctly', () => {
    const { result } = renderHook(() => useScreenshotDocuments());
    const doc1 = createMockDoc('1');
    const doc2 = createMockDoc('2');

    act(() => {
      result.current.addDocument(doc1);
    });

    act(() => {
      result.current.addDocument(doc2);
    });

    act(() => {
      result.current.setActiveDocumentId('1');
    });

    const snapshot = {
      annotation: { 
        objects: [{ id: 'obj1' } as any], 
        activeTool: 'select' as const, 
        selectedId: null, 
        editingTextId: null, 
        toolbarCollapsed: false 
      },
      cropBounds: { x: 10, y: 10, w: 100, h: 100 },
      undoStack: [],
    };

    act(() => {
      result.current.switchToDocument('2', snapshot);
    });

    expect(result.current.activeDocumentId).toBe('2');
    const updatedDoc1 = result.current.documents.find(d => d.id === '1');
    expect(updatedDoc1?.annotation.objects).toHaveLength(1);
    expect(updatedDoc1?.cropBounds).toEqual(snapshot.cropBounds);
  });
});
