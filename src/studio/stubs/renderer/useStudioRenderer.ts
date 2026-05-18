import { RefObject } from 'react';
import type { StudioRenderConfig, StudioExportHandle } from '../../types';

export function useStudioRenderer(
  _canvasRef: RefObject<HTMLCanvasElement>,
  _config: StudioRenderConfig | null,
  _onHandleChange: (h: StudioExportHandle | null) => void,
): void {}
