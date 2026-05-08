import {
  ArrowObject,
  RectangleObject,
  BlurObject,
  SpotlightObject,
  MagnifyObject,
  SimplifyUiObject,
  PixelRulerObject,
  CalloutObject,
  PixelateObject,
  OpaqueRedactObject,
  AnnotateObject,
} from '../state/types';
import { DrawingStart } from '../state/drawingTypes';

export function createDragAnnotationObject(
  type: DrawingStart['type'],
  start: { x: number; y: number },
  end: { x: number; y: number },
  id: string
): AnnotateObject | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const w = Math.abs(dx);
  const h = Math.abs(dy);

  switch (type) {
    case 'arrow': {
      const arrow: ArrowObject = {
        id, type: 'arrow', x: start.x, y: start.y, rotation: 0,
        points: [0, 0, dx, dy], stroke: '#ef4444', strokeWidth: 4,
        pointerLength: 12, pointerWidth: 12, style: 'solid', draggable: true,
      };
      return arrow;
    }
    case 'rectangle': {
      const rect: RectangleObject = {
        id, type: 'rectangle', x: left, y: top, rotation: 0,
        width: w, height: h, stroke: '#ef4444', strokeWidth: 4,
        lineStyle: 'solid', cornerRadius: 0, draggable: true,
      };
      return rect;
    }
    case 'blur': {
      const blur: BlurObject = {
        id, type: 'blur', x: left, y: top, rotation: 0,
        width: w, height: h, blurRadius: 10, draggable: true,
      };
      return blur;
    }
    case 'pixelate': {
      const pixelate: PixelateObject = {
        id, type: 'pixelate', x: left, y: top, rotation: 0,
        width: w, height: h, pixelSize: 12, borderColor: '#000000', borderWidth: 0, draggable: true,
      };
      return pixelate;
    }
    case 'opaque_redact': {
      const redact: OpaqueRedactObject = {
        id, type: 'opaque_redact', x: left, y: top, rotation: 0,
        width: w, height: h, fill: '#000000', borderColor: '#000000', borderWidth: 0, draggable: true,
      };
      return redact;
    }
    case 'spotlight': {
      const spotlight: SpotlightObject = {
        id, type: 'spotlight', x: left, y: top, rotation: 0,
        width: w, height: h, opacity: 0.58, cornerRadius: 24, draggable: true,
      };
      return spotlight;
    }
    case 'magnify': {
      const magnify: MagnifyObject = {
        id, type: 'magnify', x: left, y: top,
        sourceX: left, sourceY: top, sourceWidth: w, sourceHeight: h,
        rotation: 0, width: w * 1.8, height: h * 1.8, zoom: 1.8,
        cornerRadius: 20, borderOpacity: 0.8, draggable: true,
      };
      return magnify;
    }
    case 'simplify_ui': {
      const simplifyUi: SimplifyUiObject = {
        id, type: 'simplify_ui', x: left, y: top, rotation: 0,
        width: w, height: h, dimOpacity: 0.52, blurRadius: 4,
        saturation: 0.35, cornerRadius: 24, draggable: true,
      };
      return simplifyUi;
    }
    case 'pixel_ruler': {
      const ruler: PixelRulerObject = {
        id, type: 'pixel_ruler', x: start.x, y: start.y, rotation: 0,
        points: [0, 0, dx, dy], stroke: '#ef4444', strokeWidth: 2,
        labelFill: '#ffffff', showBackground: true, draggable: true,
      };
      return ruler;
    }
    case 'callout': {
      const callout: CalloutObject = {
        id, type: 'callout', x: end.x, y: end.y, rotation: 0,
        width: 120, height: 48, text: 'Callout', fontSize: 14,
        fontFamily: 'Inter, sans-serif', fill: '#ffffff', textColor: '#1e1e2e',
        stroke: '#1e1e2e', padding: 8, cornerRadius: 4,
        targetX: start.x, targetY: start.y, lineColor: '#1e1e2e', lineWidth: 2,
        draggable: true,
      };
      return callout;
    }
    default:
      return null;
  }
}
