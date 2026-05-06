import { AnnotateObject, TextObject, SpeechBubbleObject, CalloutObject } from './types';

export interface TextEditableContract {
  id: string;
  overlayX: number;
  overlayY: number;
  overlayWidth: number;
  overlayHeight: number;
  fixedSize: boolean;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  currentText: string;
}

/**
 * Maps any text-bearing annotation object to a common editing contract.
 * This allows the UI to render a shared textarea portal for different tool types.
 */
export function getTextEditableContract(obj: AnnotateObject | null): TextEditableContract | null {
  if (!obj) return null;

  switch (obj.type) {
    case 'text': {
      const t = obj as TextObject;
      return {
        id: t.id,
        overlayX: t.x,
        overlayY: t.y,
        overlayWidth: 120, // Portal minimum width for raw text
        overlayHeight: t.fontSize * 1.2,
        fixedSize: false,
        fontSize: t.fontSize,
        fontFamily: t.fontFamily,
        textColor: t.fill,
        currentText: t.text,
      };
    }

    case 'speech_bubble': {
      const s = obj as SpeechBubbleObject;
      return {
        id: s.id,
        overlayX: s.x + s.padding,
        overlayY: s.y + s.padding,
        overlayWidth: Math.max(40, s.width - s.padding * 2),
        overlayHeight: Math.max(20, s.height - s.padding * 2),
        fixedSize: true,
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
        textColor: s.textColor,
        currentText: s.text,
      };
    }

    case 'callout': {
      const c = obj as CalloutObject;
      return {
        id: c.id,
        overlayX: c.x + c.padding,
        overlayY: c.y + c.padding,
        overlayWidth: Math.max(40, c.width - c.padding * 2),
        overlayHeight: Math.max(20, c.height - c.padding * 2),
        fixedSize: true,
        fontSize: c.fontSize,
        fontFamily: c.fontFamily,
        textColor: c.textColor,
        currentText: c.text,
      };
    }

    default:
      return null;
  }
}
