import Konva from 'konva';
import { SpotlightObject } from '../state/types';
import { getSpotlightCornerRadius } from './spotlightLayout';

export function createSpotlightNodes(
  obj: SpotlightObject,
  stageWidth: number,
  stageHeight: number
): Konva.Rect[] {
  const cornerRadius = getSpotlightCornerRadius(obj);

  return [
    new Konva.Rect({
      id: `${obj.id}-overlay`,
      x: 0,
      y: 0,
      width: stageWidth,
      height: stageHeight,
      fill: `rgba(2, 6, 23, ${obj.opacity})`,
      listening: false,
    }),
    new Konva.Rect({
      id: `${obj.id}-cutout`,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      cornerRadius,
      fill: '#000',
      globalCompositeOperation: 'destination-out',
      listening: false,
    }),
    new Konva.Rect({
      id: `${obj.id}-rim`,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      cornerRadius,
      stroke: 'rgba(255,255,255,0.55)',
      strokeWidth: 1,
      shadowColor: '#ffffff',
      shadowBlur: 6,
      shadowOpacity: 0.12,
      listening: false,
    }),
    new Konva.Rect({
      id: obj.id,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      cornerRadius,
      stroke: '#818cf8',
      strokeWidth: 2,
      shadowColor: '#22d3ee',
      shadowBlur: 18,
      shadowOpacity: 0.28,
      listening: false,
    }),
  ];
}
