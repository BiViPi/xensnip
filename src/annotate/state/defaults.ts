import { AnnotationDefaults } from '../../compose/preset';

export const DEFAULT_ANNOTATION_DEFAULTS: AnnotationDefaults = {
  schema_version: 1,
  arrow: {
    stroke: '#ef4444',
    strokeWidth: 4,
    pointerLength: 12,
    pointerWidth: 12,
    style: 'solid',
  },
  rectangle: {
    stroke: '#ef4444',
    strokeWidth: 4,
    lineStyle: 'solid',
    cornerRadius: 0,
  },
  text: {
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    fill: '#ef4444',
    fontStyle: 'normal',
    align: 'left',
    padding: 4,
  },
  numbered: {
    radius: 14,
    fill: '#ef4444',
  },
  spotlight: {
    opacity: 0.58,
    cornerRadius: 24,
  },
  pixel_ruler: {
    stroke: '#ef4444',
    strokeWidth: 2,
    labelFill: '#ffffff',
    showBackground: true,
  },
  speech_bubble: {
    stroke: '#1e1e2e',
    fill: '#ffffff',
    textColor: '#1e1e2e',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    padding: 10,
    cornerRadius: 10,
  },
  callout: {
    stroke: '#1e1e2e',
    fill: '#ffffff',
    textColor: '#1e1e2e',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    padding: 8,
    cornerRadius: 4,
    lineColor: '#1e1e2e',
    lineWidth: 2,
  },
  freehand_arrow: {
    stroke: '#ef4444',
    strokeWidth: 4,
  },
};

export function sanitizeAnnotationDefaults(raw: any): AnnotationDefaults {
  const clean: AnnotationDefaults = { schema_version: 1 };
  if (!raw || typeof raw !== 'object') return clean;

  const sanitizeFields = (target: any, source: any, allowedKeys: string[]) => {
    for (const key of allowedKeys) {
      if (source[key] !== undefined) {
        target[key] = source[key];
      }
    }
  };

  if (raw.arrow && typeof raw.arrow === 'object') {
    clean.arrow = {} as any;
    sanitizeFields(clean.arrow, raw.arrow, ['stroke', 'strokeWidth', 'pointerLength', 'pointerWidth', 'style']);
  }
  if (raw.rectangle && typeof raw.rectangle === 'object') {
    clean.rectangle = {} as any;
    sanitizeFields(clean.rectangle, raw.rectangle, ['stroke', 'strokeWidth', 'lineStyle', 'cornerRadius']);
  }
  if (raw.text && typeof raw.text === 'object') {
    clean.text = {} as any;
    sanitizeFields(clean.text, raw.text, ['fontSize', 'fontFamily', 'fill', 'fontStyle', 'align', 'padding']);
  }
  if (raw.numbered && typeof raw.numbered === 'object') {
    clean.numbered = {} as any;
    sanitizeFields(clean.numbered, raw.numbered, ['radius', 'fill']);
  }
  if (raw.spotlight && typeof raw.spotlight === 'object') {
    clean.spotlight = {} as any;
    sanitizeFields(clean.spotlight, raw.spotlight, ['opacity', 'cornerRadius']);
  }
  if (raw.pixel_ruler && typeof raw.pixel_ruler === 'object') {
    clean.pixel_ruler = {} as any;
    sanitizeFields(clean.pixel_ruler, raw.pixel_ruler, ['stroke', 'strokeWidth', 'labelFill', 'showBackground']);
  }
  if (raw.speech_bubble && typeof raw.speech_bubble === 'object') {
    clean.speech_bubble = {} as any;
    sanitizeFields(clean.speech_bubble, raw.speech_bubble, ['stroke', 'fill', 'textColor', 'fontSize', 'fontFamily', 'padding', 'cornerRadius']);
  }
  if (raw.callout && typeof raw.callout === 'object') {
    clean.callout = {} as any;
    sanitizeFields(clean.callout, raw.callout, ['stroke', 'fill', 'textColor', 'fontSize', 'fontFamily', 'padding', 'cornerRadius', 'lineColor', 'lineWidth']);
  }
  if (raw.freehand_arrow && typeof raw.freehand_arrow === 'object') {
    clean.freehand_arrow = {} as any;
    sanitizeFields(clean.freehand_arrow, raw.freehand_arrow, ['stroke', 'strokeWidth']);
  }

  return clean;
}
