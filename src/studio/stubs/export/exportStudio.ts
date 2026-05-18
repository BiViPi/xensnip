import type { StudioExportHandle } from '../../types';
import type { RatioOption } from '../../../compose/preset';

function resolveExportDimensions(ratio: RatioOption): [number, number] {
  switch (ratio) {
    case '16:9': return [2560, 1440];
    case '4:3':  return [2560, 1920];
    case '1:1':  return [2560, 2560];
    case '3:4':  return [1920, 2560];
    case '9:16': return [1440, 2560];
    case 'Auto': return [2560, 2560];
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function exportStudioPng(
  handle: StudioExportHandle,
  ratio: RatioOption,
): Promise<Uint8Array> {
  if (!handle.isReady) throw new Error('Studio renderer not ready');
  const [w, h] = resolveExportDimensions(ratio);
  const dataUrl = await handle.exportPng(w, h);
  return dataUrlToBytes(dataUrl);
}
