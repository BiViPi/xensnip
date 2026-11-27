import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_PRESET, normalizeEditorPreset } from '../compose/preset';

import { drawComposition, getCompositionDimensions } from '../compose/core';
import { renderBlur } from '../annotate/renderers/BlurRenderer';
import { renderPixelate } from '../annotate/renderers/PixelateRenderer';


describe('DEFAULT_PRESET', () => {
  it('has shadow_enabled: true', () => {
    expect(DEFAULT_PRESET.shadow_enabled).toBe(true);
  });

  it('has ratio 16:9', () => {
    expect(DEFAULT_PRESET.ratio).toBe('16:9');
  });

  it('spread-merge preserves other fields when overriding padding', () => {
    const merged = { ...DEFAULT_PRESET, padding: 64 };
    expect(merged.padding).toBe(64);
    expect(merged.shadow_enabled).toBe(DEFAULT_PRESET.shadow_enabled);
    expect(merged.ratio).toBe(DEFAULT_PRESET.ratio);
  });
});

describe('normalizeEditorPreset', () => {
  it('returns default preset on null/undefined/non-object input', () => {
    expect(normalizeEditorPreset(null)).toEqual(DEFAULT_PRESET);
    expect(normalizeEditorPreset(undefined)).toEqual(DEFAULT_PRESET);
    expect(normalizeEditorPreset(42)).toEqual(DEFAULT_PRESET);
    expect(normalizeEditorPreset("invalid")).toEqual(DEFAULT_PRESET);
  });

  it('merges partial input with DEFAULT_PRESET and fills missing properties', () => {
    const raw = {
      presentation_mode: 'studio',
      padding: 12,
    };
    const normalized = normalizeEditorPreset(raw);
    expect(normalized.presentation_mode).toBe('studio');
    expect(normalized.padding).toBe(12);
    expect(normalized.ratio).toBe(DEFAULT_PRESET.ratio);
    expect(normalized.shadow_enabled).toBe(DEFAULT_PRESET.shadow_enabled);
  });

  it('strips forbidden redaction keys from annotation_defaults', () => {
    const raw = {
      annotation_defaults: {
        text: { fontSize: 32 },
        blur: { amount: 10 }, // forbidden redaction key
        pixelate: { size: 5 }, // forbidden redaction key
        schema_version: 1,
      } as any
    };
    const normalized = normalizeEditorPreset(raw);
    expect(normalized.annotation_defaults).toBeDefined();
    expect(normalized.annotation_defaults?.text?.fontSize).toBe(32);
    expect((normalized.annotation_defaults as any).blur).toBeUndefined();
    expect((normalized.annotation_defaults as any).pixelate).toBeUndefined();
  });

  it('correctly defaults and sanitizes annotation_defaults', () => {
    const raw = {
      annotation_defaults: {
        text: { fontSize: 32 }, // partial text defaults
        schema_version: 1,
      }
    };
    const normalized = normalizeEditorPreset(raw);
    expect(normalized.annotation_defaults).toBeDefined();
    expect(normalized.annotation_defaults?.schema_version).toBe(1);
    expect(normalized.annotation_defaults?.text?.fontSize).toBe(32);
  });

  it('preserves valid placed_annotations objects', () => {
    const raw = {
      placed_annotations: {
        schema_version: 1,
        objects: [
          {
            id: 'obj-1',
            type: 'arrow',
            x: 10,
            y: 20,
            rotation: 0,
            draggable: true,
            points: [0, 0, 40, 50],
            stroke: '#ef4444',
            strokeWidth: 4,
            pointerLength: 12,
            pointerWidth: 12,
            style: 'solid',
          },
        ],
      },
    };
    const normalized = normalizeEditorPreset(raw);
    expect(normalized.placed_annotations?.objects).toHaveLength(1);
    expect(normalized.placed_annotations?.objects[0]).toMatchObject({
      id: 'obj-1',
      type: 'arrow',
      x: 10,
      y: 20,
    });
  });

  it('filters invalid placed_annotations entries', () => {
    const raw = {
      placed_annotations: {
        schema_version: 1,
        objects: [
          { bad: true },
          {
            id: 'obj-2',
            type: 'text',
            x: 10,
            y: 20,
            rotation: 0,
            draggable: true,
            text: 'ok',
            fontSize: 24,
            fontFamily: 'Inter',
            fill: '#fff',
            fontStyle: 'normal',
            align: 'left',
            padding: 4,
          },
        ],
      },
    };
    const normalized = normalizeEditorPreset(raw);
    expect(normalized.placed_annotations?.objects).toHaveLength(1);
    expect(normalized.placed_annotations?.objects[0]).toMatchObject({ id: 'obj-2' });
  });
});

describe('canvas composition and effect renderer guards', () => {
  it('drawComposition handles single-stop Gradient without NaN addColorStop', () => {
    const addColorStop = vi.fn();
    const ctx = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop })),
      createRadialGradient: vi.fn(() => ({ addColorStop })),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D;

    const singleStopPreset = {
      ...DEFAULT_PRESET,
      bg_mode: 'Gradient' as const,
      bg_colors: ['#ff5500'],
      border_width: 0,
      shadow_enabled: false,
      radius: 0,
    };
    const img = { width: 100, height: 80 } as HTMLImageElement;
    const dims = getCompositionDimensions(100, 80, singleStopPreset);

    expect(() => drawComposition(ctx, img, singleStopPreset, dims)).not.toThrow();
    expect(addColorStop).toHaveBeenCalledWith(0, '#ff5500');
    expect(addColorStop).toHaveBeenCalledWith(1, '#ff5500');
  });

  it('renderBlur returns early when expanded capture bounds have zero or negative area', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const source = { width: 100, height: 100 } as HTMLCanvasElement;

    expect(() =>
      renderBlur(
        ctx,
        {
          id: 'b1',
          type: 'blur',
          x: 200,
          y: 200,
          width: 40,
          height: 40,
          blurRadius: 5,
          rotation: 0,
          draggable: false,
        },
        source,
      ),
    ).not.toThrow();
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it('renderPixelate restores context symmetrically if temp canvas context fails', () => {
    const save = vi.fn();
    const restore = vi.fn();
    const ctx = { save, restore } as unknown as CanvasRenderingContext2D;
    const source = { width: 100, height: 100 } as HTMLCanvasElement;
    const origCreateElement = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tag);
    });

    try {
      renderPixelate(
        ctx,
        {
          id: 'p1',
          type: 'pixelate',
          x: 10,
          y: 10,
          width: 40,
          height: 40,
          pixelSize: 8,
          rotation: 0,
          borderColor: '#000',
          borderWidth: 0,
          draggable: false,
        },
        source,
      );
      expect(save).toHaveBeenCalledTimes(1);
      expect(restore).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
