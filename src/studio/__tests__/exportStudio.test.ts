import { describe, it, expect, vi } from 'vitest';
import { exportStudioPng } from '@studio-impl/export/exportStudio';
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
    expect(handle.exportPng).toHaveBeenCalledWith(2560, 1440);
  });

  it('calls handle.exportPng with correct dimensions for 1:1', async () => {
    const handle = makeHandle();
    await exportStudioPng(handle, '1:1');
    expect(handle.exportPng).toHaveBeenCalledWith(2560, 2560);
  });

  it('calls handle.exportPng with correct dimensions for 9:16', async () => {
    const handle = makeHandle();
    await exportStudioPng(handle, '9:16');
    expect(handle.exportPng).toHaveBeenCalledWith(1440, 2560);
  });

  it('calls handle.exportPng with correct dimensions for Auto', async () => {
    const handle = makeHandle();
    await exportStudioPng(handle, 'Auto');
    expect(handle.exportPng).toHaveBeenCalledWith(2560, 2560);
  });

  it('dataUrlToBytes round-trip — returns correct byte values', async () => {
    // base64('AQID') = [0x01, 0x02, 0x03]
    const handle = makeHandle({ exportPng: vi.fn().mockResolvedValue('data:image/png;base64,AQID') });
    const bytes = await exportStudioPng(handle, '1:1');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(bytes)).toEqual([0x01, 0x02, 0x03]);
  });
});
