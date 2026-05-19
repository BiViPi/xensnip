import type { StudioBackground } from '../../types';

import deskLight from '../../../assets/studio/desk-light.webp';
import techDark from '../../../assets/studio/tech-dark.webp';

export const STUDIO_BACKGROUNDS: StudioBackground[] = [
  {
    id: 'desk-light', label: 'Minimalist Desk',
    imageSrc: deskLight, tone: 'light', focusX: 0.5, focusY: 0.62, alignX: 'center', alignY: 'center',
    light:  { color: 0xfff5e4, intensity: 1.4, position: [6, 9, 3] },
    shadow: { intensity: 0.38, angle: 26 },
  },
  {
    id: 'tech-dark', label: 'Dark Studio',
    imageSrc: techDark, tone: 'dark', focusX: 0.5, focusY: 0.74, alignX: 'center', alignY: 'bottom',
    light:  { color: 0xd0e8ff, intensity: 1.1, position: [-4, 8, 5] },
    shadow: { intensity: 0.55, angle: -20 },
  },
];
