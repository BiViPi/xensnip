import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDragAnnotationObject } from '../pointer/dragObjectFactory';

describe('createDragAnnotationObject', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(9999);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const start = { x: 10, y: 20 };
  const end = { x: 110, y: 70 };

  it('creates an arrow object with relative points', () => {
    const obj = createDragAnnotationObject('arrow', start, end, 'id-1');
    expect(obj).toMatchObject({
      id: 'id-1',
      type: 'arrow',
      x: 10,
      y: 20,
      points: [0, 0, 100, 50],
      stroke: '#ef4444',
      draggable: true,
    });
  });

  it('creates a rectangle normalized to top-left origin', () => {
    const obj = createDragAnnotationObject('rectangle', { x: 110, y: 70 }, { x: 10, y: 20 }, 'id-2');
    expect(obj).toMatchObject({
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
  });

  it('creates a blur object', () => {
    const obj = createDragAnnotationObject('blur', start, end, 'id-3');
    expect(obj).toMatchObject({ type: 'blur', width: 100, height: 50, blurRadius: 10 });
  });

  it('creates a pixelate object', () => {
    const obj = createDragAnnotationObject('pixelate', start, end, 'id-4');
    expect(obj).toMatchObject({ type: 'pixelate', width: 100, height: 50, pixelSize: 12 });
  });

  it('creates an opaque_redact object', () => {
    const obj = createDragAnnotationObject('opaque_redact', start, end, 'id-5');
    expect(obj).toMatchObject({ type: 'opaque_redact', fill: '#000000' });
  });

  it('creates a spotlight object', () => {
    const obj = createDragAnnotationObject('spotlight', start, end, 'id-6');
    expect(obj).toMatchObject({ type: 'spotlight', opacity: 0.58, cornerRadius: 24 });
  });

  it('creates a magnify object with 1.8x zoom', () => {
    const obj = createDragAnnotationObject('magnify', start, end, 'id-7');
    expect(obj).toMatchObject({
      type: 'magnify',
      zoom: 1.8,
      width: 100 * 1.8,
      height: 50 * 1.8,
    });
  });

  it('creates a simplify_ui object', () => {
    const obj = createDragAnnotationObject('simplify_ui', start, end, 'id-8');
    expect(obj).toMatchObject({ type: 'simplify_ui', dimOpacity: 0.52 });
  });

  it('creates a pixel_ruler with absolute start position', () => {
    const obj = createDragAnnotationObject('pixel_ruler', start, end, 'id-9');
    expect(obj).toMatchObject({
      type: 'pixel_ruler',
      x: 10,
      y: 20,
      points: [0, 0, 100, 50],
    });
  });

  it('creates a callout with end as anchor and start as target', () => {
    const obj = createDragAnnotationObject('callout', start, end, 'id-10');
    expect(obj).toMatchObject({
      type: 'callout',
      x: end.x,
      y: end.y,
      targetX: start.x,
      targetY: start.y,
    });
  });

  it('returns null for unknown draw type', () => {
    const obj = createDragAnnotationObject(
      'unknown_type' as never,
      start,
      end,
      'id-11'
    );
    expect(obj).toBeNull();
  });
});
