import { describe, it, expect } from 'vitest';
import { TOOL_TO_DRAW_TYPE } from '../drawingTypeMap';

describe('TOOL_TO_DRAW_TYPE', () => {
  it('maps every drag-to-create tool to a drawing type', () => {
    const expected = [
      ['arrow', 'arrow'],
      ['rectangle', 'rectangle'],
      ['blur', 'blur'],
      ['pixelate', 'pixelate'],
      ['opaque_redact', 'opaque_redact'],
      ['spotlight', 'spotlight'],
      ['magnify', 'magnify'],
      ['simplify_ui', 'simplify_ui'],
      ['pixel_ruler', 'pixel_ruler'],
      ['callout', 'callout'],
      ['freehand_arrow', 'freehand_arrow'],
    ] as const;

    for (const [tool, drawType] of expected) {
      expect(TOOL_TO_DRAW_TYPE[tool]).toBe(drawType);
    }
  });

  it('does not include immediate-creation tools', () => {
    expect(TOOL_TO_DRAW_TYPE['text' as never]).toBeUndefined();
    expect(TOOL_TO_DRAW_TYPE['numbered' as never]).toBeUndefined();
    expect(TOOL_TO_DRAW_TYPE['speech_bubble' as never]).toBeUndefined();
  });

  it('does not include select or utility tools', () => {
    expect(TOOL_TO_DRAW_TYPE['select' as never]).toBeUndefined();
    expect(TOOL_TO_DRAW_TYPE['crop' as never]).toBeUndefined();
  });
});
