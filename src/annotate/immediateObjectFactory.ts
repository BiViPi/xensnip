import { 
  TextObject, 
  NumberedObject, 
  SpeechBubbleObject 
} from './state/types';

export const createImmediateText = (x: number, y: number): TextObject => ({
  id: `obj-${Date.now()}`,
  type: 'text',
  x,
  y,
  rotation: 0,
  text: 'Type here...',
  fontSize: 24,
  fontFamily: 'Inter, sans-serif',
  fill: '#ef4444',
  padding: 4,
  fontStyle: 'normal',
  align: 'left',
  draggable: true,
});

export const createImmediateNumbered = (x: number, y: number, count: number): NumberedObject => ({
  id: `obj-${Date.now()}`,
  type: 'numbered',
  x,
  y,
  rotation: 0,
  displayNumber: count + 1,
  fill: '#ef4444',
  radius: 14,
  draggable: true,
});

export const createImmediateSpeechBubble = (x: number, y: number): SpeechBubbleObject => ({
  id: `obj-${Date.now()}`,
  type: 'speech_bubble',
  x: x - 80,
  y: y - 36,
  rotation: 0,
  width: 160,
  height: 72,
  text: 'Type here...',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  fill: '#ffffff',
  textColor: '#1e1e2e',
  stroke: '#1e1e2e',
  padding: 10,
  cornerRadius: 10,
  tailX: 80,
  tailY: 90,
  draggable: true,
});
