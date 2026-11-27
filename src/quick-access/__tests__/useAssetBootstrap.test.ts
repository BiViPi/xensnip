import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAssetBootstrap } from '../useAssetBootstrap';
import { hasAnyUnsavedSessionChanges } from '../unsavedChanges';
import { createScreenshotDocument } from '../../test/builders/screenshotDocument';

// Mock Image global since JSDOM might not trigger onload correctly
class MockImage {
  src: string = '';
  onload: () => void = () => {};
  constructor() {
    setTimeout(() => this.onload(), 0);
  }
}
(global as any).Image = MockImage;

// Mock IPC
vi.mock('../../ipc/index', () => ({
  assetResolve: vi.fn().mockResolvedValue(undefined),
  assetRelease: vi.fn().mockResolvedValue(undefined),
  assetReadPng: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  perfLog: vi.fn(),
  settingsLoad: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../editor/generateThumbnail', () => ({
  generateThumbnail: vi.fn().mockResolvedValue('data:thumb'),
  generateDocumentThumbnail: vi.fn().mockResolvedValue('data:doc-thumb'),
}));

describe('useAssetBootstrap Redo support', () => {
  const createMockDeps = () => ({
    docsRef: { current: [] as any[] },
    activeIdRef: { current: null as string | null },
    addDocument: vi.fn((doc) => [doc]),
    releaseDocument: vi.fn(),
    patchDocument: vi.fn(),
    flushActiveDocument: vi.fn(),
    handleSwitchDocument: vi.fn(),
    setActiveDocumentId: vi.fn(),
    setImage: vi.fn(),
    setCropBounds: vi.fn(),
    setSettings: vi.fn(),
    setPreset: vi.fn(),
    undoStackRef: { current: [] },
    redoStackRef: { current: [{ imageSrc: 'old', annotation: {} as any, cropBounds: null }] },
  });

  it('new documents start with an empty redo stack', async () => {
    const deps = createMockDeps();
    const { result } = renderHook(() => useAssetBootstrap(deps as any));

    await act(async () => {
      await result.current.bootstrapAsset('asset-1');
    });

    const calledDoc = deps.addDocument.mock.calls[0][0];
    expect(calledDoc.redoStack).toEqual([]);
  });

  it('bootstrap resets redoStackRef to an empty array', async () => {
    const deps = createMockDeps();
    deps.redoStackRef.current = [{ imageSrc: 'stale', annotation: {} as any, cropBounds: null }];
    
    const { result } = renderHook(() => useAssetBootstrap(deps as any));

    await act(async () => {
      await result.current.bootstrapAsset('asset-2');
    });

    expect(deps.redoStackRef.current).toEqual([]);
  });

  it('flushes the active document before bootstrapping a new asset', async () => {
    const deps = createMockDeps();
    deps.docsRef.current = [
      {
        id: 'doc-1',
        canvas: {
          images: [{ assetId: 'asset-existing' }],
        },
      } as any,
    ];

    const { result } = renderHook(() => useAssetBootstrap(deps as any));

    await act(async () => {
      await result.current.bootstrapAsset('asset-new');
    });

    expect(deps.flushActiveDocument).toHaveBeenCalledTimes(1);
  });

  it('does not flush when switching to an already-open asset', async () => {
    const deps = createMockDeps();
    deps.docsRef.current = [
      {
        id: 'doc-1',
        canvas: {
          images: [{ assetId: 'asset-existing' }],
        },
      } as any,
    ];

    const { result } = renderHook(() => useAssetBootstrap(deps as any));

    await act(async () => {
      await result.current.bootstrapAsset('asset-existing');
    });

    expect(deps.flushActiveDocument).not.toHaveBeenCalled();
    expect(deps.handleSwitchDocument).toHaveBeenCalledWith('doc-1');
  });

  it('releases the UI asset when bootstrap fails after resolve', async () => {
    const deps = createMockDeps();
    const { assetReadPng, assetRelease } = await import('../../ipc/index');
    vi.mocked(assetReadPng).mockRejectedValueOnce(new Error('read failed'));

    const { result } = renderHook(() => useAssetBootstrap(deps as any));

    await expect(
      act(async () => {
        await result.current.bootstrapAsset('asset-bad');
      }),
    ).rejects.toThrow('read failed');

    expect(assetRelease).toHaveBeenCalledWith('asset-bad', 'quick_access_ui');
  });

  it('always creates a new document for capture 2 instead of appending into the active canvas', async () => {
    const deps = createMockDeps();
    const activeDoc = createScreenshotDocument('doc-1');
    deps.docsRef.current = [activeDoc];
    deps.activeIdRef.current = activeDoc.id;

    const { result } = renderHook(() => useAssetBootstrap(deps as any));

    await act(async () => {
      await result.current.bootstrapAsset('asset-2');
    });

    expect(deps.addDocument).toHaveBeenCalledTimes(1);
    expect(deps.patchDocument).not.toHaveBeenCalledWith(
      activeDoc.id,
      expect.objectContaining({
        canvas: expect.anything(),
      }),
    );
    expect(deps.setActiveDocumentId).toHaveBeenCalledWith(expect.any(String));
  });

  it('rejects and cleans up asset ref if cropped window inset image fails to load', async () => {
    const deps = createMockDeps();
    const { assetRelease } = await import('../../ipc/index');
    const OrigImage = (global as any).Image;
    const origCreateElement = document.createElement.bind(document);
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:raw-window');

    let imageCount = 0;
    class CropErrorImage {
      naturalWidth = 100;
      naturalHeight = 100;
      width = 100;
      height = 100;
      src = '';
      onload: () => void = () => {};
      onerror: (e?: unknown) => void = () => {};
      constructor() {
        const idx = ++imageCount;
        setTimeout(() => {
          if (idx === 1) this.onload();
          else this.onerror(new Error('decode failed'));
        }, 0);
      }
    }

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL: () => 'data:image/png;base64,AA==',
        } as any;
      }
      return origCreateElement(tag);
    });
    (global as any).Image = CropErrorImage;

    try {
      const { result } = renderHook(() => useAssetBootstrap(deps as any));
      await expect(
        act(async () => {
          await result.current.bootstrapAsset('asset-crop-err', { captureKind: 'window' });
        }),
      ).rejects.toThrow();

      expect(assetRelease).toHaveBeenCalledWith('asset-crop-err', 'quick_access_ui');
      expect(revokeSpy).toHaveBeenCalledWith('blob:raw-window');
    } finally {
      (global as any).Image = OrigImage;
      createElementSpy.mockRestore();
      revokeSpy.mockRestore();
    }
  });

  it('does not overwrite active shell preset when async settingsLoad resolves after switching documents', async () => {
    const deps = createMockDeps();
    const { settingsLoad } = await import('../../ipc/index');
    let resolveSettings!: (val: any) => void;
    vi.mocked(settingsLoad).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSettings = resolve;
      }),
    );

    const { result } = renderHook(() => useAssetBootstrap(deps as any));
    let pendingPromise!: Promise<void>;
    await act(async () => {
      pendingPromise = result.current.bootstrapAsset('asset-stale');
      await new Promise((r) => setTimeout(r, 15));
    });

    const newDoc = deps.addDocument.mock.calls[0][0];
    deps.activeIdRef.current = 'another-doc-id';
    deps.setPreset.mockClear();

    await act(async () => {
      resolveSettings({
        default_presentation_mode: 'studio',
        saved_presets: [],
        last_preset: null,
        default_preset_id: null,
      });
      await pendingPromise;
    });

    expect(deps.patchDocument).toHaveBeenCalledWith(
      newDoc.id,
      expect.objectContaining({ preset: expect.objectContaining({ presentation_mode: 'studio' }) }),
    );
    expect(deps.setPreset).not.toHaveBeenCalled();
  });
});

describe('hasAnyUnsavedSessionChanges', () => {
  it('returns true when a background document has annotations even if the active shell is clean', () => {
    const doc1 = createScreenshotDocument('doc-1');
    doc1.annotation.objects = [{ id: 'a1' } as any];
    const doc2 = createScreenshotDocument('doc-2');

    expect(
      hasAnyUnsavedSessionChanges(
        { objectsLength: 0, cropBounds: null, undoLength: 0, redoLength: 0 },
        [doc1, doc2],
      ),
    ).toBe(true);
  });

  it('returns false when active shell and all documents are clean', () => {
    const doc1 = createScreenshotDocument('doc-1');
    const doc2 = createScreenshotDocument('doc-2');

    expect(
      hasAnyUnsavedSessionChanges(
        { objectsLength: 0, cropBounds: null, undoLength: 0, redoLength: 0 },
        [doc1, doc2],
      ),
    ).toBe(false);
  });
});
