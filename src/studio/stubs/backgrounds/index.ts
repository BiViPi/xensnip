import type { StudioBackground } from '../../types';
import { STUDIO_BACKGROUNDS } from './catalog';

export function getBackground(id: string): StudioBackground {
  const bg = STUDIO_BACKGROUNDS.find(b => b.id === id);
  if (!bg) throw new Error(`Unknown studio background: ${id}`);
  return bg;
}

export { STUDIO_BACKGROUNDS };
