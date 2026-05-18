import type { StudioRenderConfig, ViewMode } from '../../types';

export class StudioRenderer {
  constructor(_canvas: HTMLCanvasElement) {}

  applyConfig(_config: StudioRenderConfig): void {}

  resize(_width: number, _height: number): void {}

  setViewMode(_mode: ViewMode): void {}

  exportPng(_targetWidth: number, _targetHeight: number): Promise<string> {
    return Promise.reject(new Error('Studio renderer not available'));
  }

  destroy(): void {}
}
