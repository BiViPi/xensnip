import { 
  TextObject, 
  NumberedObject, 
  SpeechBubbleObject 
} from './state/types';
import { TextDefaults, NumberedDefaults, SpeechBubbleDefaults } from '../compose/preset';

export const createImmediateText = (
  x: number,
  y: number,
  defaults?: TextDefaults
): TextObject => ({
  id: `obj-${Date.now()}`,
  type: 'text',
  x,
  y,
  rotation: 0,
  text: 'Type here...',
  fontSize: defaults?.fontSize ?? 24,
  fontFamily: defaults?.fontFamily ?? 'Inter, sans-serif',
  fill: defaults?.fill ?? '#ef4444',
  padding: defaults?.padding ?? 4,
  fontStyle: defaults?.fontStyle ?? 'normal',
  align: defaults?.align ?? 'left',
  draggable: true,
});

export const createImmediateNumbered = (
  x: number,
  y: number,
  count: number,
  defaults?: NumberedDefaults
): NumberedObject => ({
  id: `obj-${Date.now()}`,
  type: 'numbered',
  x,
  y,
  rotation: 0,
  displayNumber: count + 1,
  fill: defaults?.fill ?? '#ef4444',
  radius: defaults?.radius ?? 14,
  draggable: true,
});

export const createImmediateSpeechBubble = (
  x: number,
  y: number,
  defaults?: SpeechBubbleDefaults
): SpeechBubbleObject => ({
  id: `obj-${Date.now()}`,
  type: 'speech_bubble',
  x: x - 80,
  y: y - 36,
  rotation: 0,
  width: 160,
  height: 72,
  text: 'Type here...',
  fontSize: defaults?.fontSize ?? 14,
  fontFamily: defaults?.fontFamily ?? 'Inter, sans-serif',
  fill: defaults?.fill ?? '#ffffff',
  textColor: defaults?.textColor ?? '#1e1e2e',
  stroke: defaults?.stroke ?? '#1e1e2e',
  padding: defaults?.padding ?? 10,
  cornerRadius: defaults?.cornerRadius ?? 10,
  tailX: 80,
  tailY: 90,
  draggable: true,
});
