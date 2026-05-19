import type { FrameRenderer, StudioGeometryParams, FrameStyle } from '../../types';

export class BrowserFrame implements FrameRenderer {
  hasTitleBar = true;

  buildGeometry(_params: StudioGeometryParams): never {
    throw new Error('Studio frame renderer not available');
  }

  buildMaterial(_style: FrameStyle): never {
    throw new Error('Studio frame renderer not available');
  }

  getActualDepth(params: StudioGeometryParams): number {
    return params.depth;
  }

  getContentLayout(_params: StudioGeometryParams): never {
    throw new Error('Studio frame renderer not available');
  }
}
