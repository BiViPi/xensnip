import { describe, it, expect, vi } from 'vitest';
import { exportStudioPng } from '@studio-impl/export/exportStudio';
import { StudioRenderer } from '@studio-impl/renderer/StudioRenderer';
import type { StudioExportHandle } from '../types';

function makeHandle(overrides: Partial<StudioExportHandle> = {}): StudioExportHandle {
  return {
    isReady: true,
    exportPng: vi.fn().mockResolvedValue('data:image/png;base64,AQID'),
    ...overrides,
  };
}

describe('exportStudioPng', () => {
  it('throws when handle is not ready', async () => {
    const handle = makeHandle({ isReady: false });
    await expect(exportStudioPng(handle, '16:9')).rejects.toThrow('Studio renderer not ready');
  });

  it('calls handle.exportPng with correct dimensions for 16:9', async () => {
    const handle = makeHandle();
    await exportStudioPng(handle, '16:9');
    expect(handle.exportPng).toHaveBeenCalledWith(3840, 2160);
  });

  it('calls handle.exportPng with correct dimensions for 1:1', async () => {
    const handle = makeHandle();
    await exportStudioPng(handle, '1:1');
    expect(handle.exportPng).toHaveBeenCalledWith(3840, 3840);
  });

  it('calls handle.exportPng with correct dimensions for 9:16', async () => {
    const handle = makeHandle();
    await exportStudioPng(handle, '9:16');
    expect(handle.exportPng).toHaveBeenCalledWith(2160, 3840);
  });

  it('calls handle.exportPng with correct dimensions for Auto', async () => {
    const handle = makeHandle();
    await exportStudioPng(handle, 'Auto');
    expect(handle.exportPng).toHaveBeenCalledWith(3840, 3840);
  });

  it('dataUrlToBytes round-trip — returns correct byte values', async () => {
    // base64('AQID') = [0x01, 0x02, 0x03]
    const handle = makeHandle({ exportPng: vi.fn().mockResolvedValue('data:image/png;base64,AQID') });
    const bytes = await exportStudioPng(handle, '1:1');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(bytes)).toEqual([0x01, 0x02, 0x03]);
  });
});

describe('StudioRenderer edge guards', () => {
  it('resize returns early when width or height is zero or negative', () => {
    const setSize = vi.fn();
    const updateProjectionMatrix = vi.fn();
    const markDirty = vi.fn();
    const fakeRenderer = {
      threeRenderer: { setSize },
      camera: { aspect: 1.5, updateProjectionMatrix },
      lastConfig: null,
      scheduler: { markDirty },
      applyFrameOffset: vi.fn(),
      updateBgScale: vi.fn(),
    };

    StudioRenderer.prototype.resize.call(fakeRenderer as unknown as StudioRenderer, 800, 0);
    StudioRenderer.prototype.resize.call(fakeRenderer as unknown as StudioRenderer, 0, 600);

    expect(setSize).not.toHaveBeenCalled();
    expect(updateProjectionMatrix).not.toHaveBeenCalled();
    expect(fakeRenderer.camera.aspect).toBe(1.5);
  });

  it('exportPng restores renderer pixelRatio, size, and camera aspect even if toDataURL throws', async () => {
    const setPixelRatio = vi.fn();
    const setSize = vi.fn();
    const render = vi.fn();
    const updateProjectionMatrix = vi.fn();
    const markDirty = vi.fn();
    const fakeRenderer = {
      threeRenderer: {
        getSize: (v: { set?: (x: number, y: number) => void; x?: number; y?: number }) => {
          v.x = 800;
          v.y = 600;
          return v;
        },
        getPixelRatio: () => 2,
        setPixelRatio,
        setSize,
        render,
        domElement: {
          toDataURL: () => {
            throw new Error('toDataURL failed');
          },
        },
      },
      camera: { aspect: 800 / 600, updateProjectionMatrix },
      scene: {},
      lastConfig: null,
      scheduler: { markDirty },
      applyFrameOffset: vi.fn(),
      updateBgScale: vi.fn(),
    };

    await expect(
      StudioRenderer.prototype.exportPng.call(
        fakeRenderer as unknown as StudioRenderer,
        3840,
        2160,
      ),
    ).rejects.toThrow('toDataURL failed');

    expect(setPixelRatio).toHaveBeenLastCalledWith(2);
    expect(setSize).toHaveBeenLastCalledWith(800, 600, false);
    expect(fakeRenderer.camera.aspect).toBeCloseTo(800 / 600, 5);
    expect(markDirty).toHaveBeenCalled();
  });
});
