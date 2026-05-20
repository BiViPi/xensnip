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

  getContentLayout(params: StudioGeometryParams) {
    return {
      width: params.width - params.bevel * 1.6,
      height: params.height - params.bevel * 1.6,
      radius: Math.max(0, params.cornerRadius - params.bevel * 0.8),
      z: params.depth / 2 - 0.004,
      backZ: params.depth / 2 - 0.01,
    };
  }
}
