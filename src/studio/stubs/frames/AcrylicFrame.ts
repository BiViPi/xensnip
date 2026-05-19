import type { FrameRenderer, StudioGeometryParams, FrameStyle } from '../../types';

export class AcrylicFrame implements FrameRenderer {
  hasTitleBar = false;

  buildGeometry(_params: StudioGeometryParams): never {
    throw new Error('Studio frame renderer not available');
  }

  buildMaterial(_style: FrameStyle): never {
    throw new Error('Studio frame renderer not available');
  }

  getActualDepth(params: StudioGeometryParams): number {
    return params.depth * 2.5;
  }

  getContentLayout(_params: StudioGeometryParams): never {
    throw new Error('Studio frame renderer not available');
  }
}
