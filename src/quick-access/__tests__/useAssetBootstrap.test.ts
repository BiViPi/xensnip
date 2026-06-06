import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAssetBootstrap } from '../useAssetBootstrap';

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

describe('useAssetBootstrap Redo support', () => {
  const createMockDeps = () => ({
    docsRef: { current: [] as any[] },
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
        assetId: 'asset-existing',
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
        assetId: 'asset-existing',
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
});
