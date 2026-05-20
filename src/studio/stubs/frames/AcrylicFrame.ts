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

  getContentLayout(params: StudioGeometryParams) {
    const inset = Math.max(0.08, params.bevel * 2.0);
    return {
      width: params.width - inset * 2,
      height: params.height - inset * 2,
      radius: Math.max(0.008, params.cornerRadius - inset),
      z: 0.0,
      backZ: -0.002,
    };
  }
}
