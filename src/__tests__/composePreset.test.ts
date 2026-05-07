import { describe, it, expect } from 'vitest';
import { DEFAULT_PRESET } from '../compose/preset';

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
