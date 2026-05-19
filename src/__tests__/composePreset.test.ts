import { describe, it, expect } from 'vitest';
import { DEFAULT_PRESET, normalizeEditorPreset } from '../compose/preset';

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
