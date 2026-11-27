import type { StudioExportHandle, StudioRenderConfig, ViewMode } from '../../types';

export class StudioRenderer implements StudioExportHandle {
  constructor(_canvas: HTMLCanvasElement) {}

  get isReady(): boolean {
    return false;
  }

  applyConfig(_config: StudioRenderConfig): void {}

  resize(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  }

  setViewMode(_mode: ViewMode): void {}

  exportPng(_targetWidth: number, _targetHeight: number): Promise<string> {
    return Promise.reject(new Error('Studio renderer not available'));
  }

  destroy(): void {}
}
