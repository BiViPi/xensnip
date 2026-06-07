import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useScreenshotDocuments } from '../useScreenshotDocuments';
import { DEFAULT_PRESET } from '../../compose/preset';
import {
  createAnnotationSnapshot,
  createCropBounds,
  createRectangleObject,
  createScreenshotDocument,
} from '../../test/builders/screenshotDocument';
import { addCanvasImage } from '../canvasDocument';

describe('useScreenshotDocuments', () => {
  it('adds a document while active selection remains caller-owned', () => {
    const { result } = renderHook(() => useScreenshotDocuments());
    const doc = createScreenshotDocument('1');

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
        result.current.addDocument(createScreenshotDocument(i.toString()));
      });
    }

    expect(result.current.documents).toHaveLength(20);

    act(() => {
      // Add 21st document
      result.current.addDocument(createScreenshotDocument('21'));
    });

    expect(result.current.documents).toHaveLength(20);
    // Document '1' should be evicted because it was the oldest and unchecked
    expect(result.current.documents.find(d => d.id === '1')).toBeUndefined();
    expect(result.current.documents[0].id).toBe('21');
  });

  it('does not auto-evict a multi-image document when the cache is full', () => {
    const { result } = renderHook(() => useScreenshotDocuments());

    for (let i = 1; i <= 19; i++) {
      act(() => {
        result.current.addDocument(createScreenshotDocument(i.toString()));
      });
    }

    const base = createScreenshotDocument('multi');
    const multiImageDoc = {
      ...base,
      canvas: addCanvasImage(base.canvas, {
        image: base.image,
        blobUrl: 'blob:multi-2',
      }),
    };

    act(() => {
      result.current.addDocument(multiImageDoc);
    });

    expect(result.current.documents).toHaveLength(20);

    act(() => {
      result.current.addDocument(createScreenshotDocument('21', {
        isExportChecked: true,
      }));
    });

    expect(result.current.documents).toHaveLength(20);
    expect(result.current.documents.find((d) => d.id === 'multi')).toBeDefined();
    expect(result.current.documents.find((d) => d.id === '1')).toBeUndefined();
  });

  it('allows the cache to exceed 20 when every document is multi-image', () => {
    const { result } = renderHook(() => useScreenshotDocuments());

    for (let i = 1; i <= 20; i++) {
      const base = createScreenshotDocument(i.toString());
      act(() => {
        result.current.addDocument({
          ...base,
          canvas: addCanvasImage(base.canvas, {
            image: base.image,
            blobUrl: `blob:${i}:2`,
          }),
        });
      });
    }

    const extraBase = createScreenshotDocument('21');
    act(() => {
      result.current.addDocument({
        ...extraBase,
        canvas: addCanvasImage(extraBase.canvas, {
          image: extraBase.image,
          blobUrl: 'blob:21:2',
        }),
      });
    });

    expect(result.current.documents).toHaveLength(21);
    expect(result.current.documents.find((d) => d.id === '1')).toBeDefined();
  });

  it('removes a document and updates active ID only when the removed document was active', () => {
    const { result } = renderHook(() => useScreenshotDocuments());
    const doc1 = createScreenshotDocument('1');
    const doc2 = createScreenshotDocument('2');

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
    const doc1 = createScreenshotDocument('1');
    const doc2 = createScreenshotDocument('2');

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
      preset: { ...DEFAULT_PRESET, presentation_mode: 'studio' as const },
      annotation: createAnnotationSnapshot({
        objects: [createRectangleObject('obj1')],
      }),
      cropBounds: createCropBounds({ x: 10, y: 10, w: 100, h: 100 }),
      undoStack: [],
      redoStack: [],
    };

    act(() => {
      result.current.switchToDocument('2', snapshot);
    });

    expect(result.current.activeDocumentId).toBe('2');
    const updatedDoc1 = result.current.documents.find(d => d.id === '1');
    expect(updatedDoc1?.preset.presentation_mode).toBe('studio');
    expect(updatedDoc1?.annotation.objects).toHaveLength(1);
    expect(updatedDoc1?.cropBounds).toEqual(snapshot.cropBounds);
  });
});
