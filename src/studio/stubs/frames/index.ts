import type { FrameFamily, FrameRenderer } from '../../types';
import { BrowserFrame } from './BrowserFrame';
import { AcrylicFrame } from './AcrylicFrame';

export function getFrameRenderer(family: FrameFamily, _isWebGL2 = true): FrameRenderer {
  switch (family) {
    case 'browser': return new BrowserFrame();
    case 'acrylic': return new AcrylicFrame();
  }
}
