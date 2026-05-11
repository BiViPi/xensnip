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
  assetReadPng: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  perfLog: vi.fn(),
  settingsLoad: vi.fn().mockResolvedValue({}),
}));

describe('useAssetBootstrap Redo support', () => {
  const createMockDeps = () => ({
    docsRef: { current: [] },
    addDocument: vi.fn((doc) => [doc]),
    releaseDocument: vi.fn(),
    patchDocument: vi.fn(),
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
});
