import type { StudioExportHandle } from '../../types';
import type { RatioOption } from '../../../compose/preset';

function resolveExportDimensions(ratio: RatioOption): [number, number] {
  switch (ratio) {
    case '16:9': return [3840, 2160];
    case '4:3':  return [3840, 2880];
    case '1:1':  return [3840, 3840];
    case '3:4':  return [2880, 3840];
    case '9:16': return [2160, 3840];
    case 'Auto': return [3840, 3840];
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
