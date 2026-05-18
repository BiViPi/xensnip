import { describe, it, expect, vi } from 'vitest';
import { resolveStudioPreset, useStudioState, DEFAULT_STUDIO_PRESET } from '../state/useStudioState';
import { DEFAULT_PRESET } from '../../compose/preset';
import type { EditorPreset } from '../../compose/preset';

function presetWith(overrides: Partial<EditorPreset> = {}): EditorPreset {
  return { ...DEFAULT_PRESET, ...overrides };
}

describe('resolveStudioPreset', () => {
  it('returns DEFAULT_STUDIO_PRESET when studio is undefined', () => {
    expect(resolveStudioPreset(presetWith({ studio: undefined }))).toEqual(DEFAULT_STUDIO_PRESET);
  });

  it('returns the stored studio preset when set', () => {
    const custom = { ...DEFAULT_STUDIO_PRESET, frame_family: 'acrylic' as const };
    expect(resolveStudioPreset(presetWith({ studio: custom }))).toEqual(custom);
  });
});

describe('useStudioState setters', () => {
  function captureSetPreset(preset: EditorPreset) {
    let latestPreset = preset;
    const setPreset = vi.fn((updater: EditorPreset | ((p: EditorPreset) => EditorPreset)) => {
      latestPreset = typeof updater === 'function' ? updater(latestPreset) : updater;
    });
    return { setPreset, getPreset: () => latestPreset };
  }

  it('setFrameFamily patches frame_family', () => {
    const preset = presetWith();
    const { setPreset, getPreset } = captureSetPreset(preset);
    const { setFrameFamily } = useStudioState(preset, setPreset);
    setFrameFamily('acrylic');
    expect(getPreset().studio?.frame_family).toBe('acrylic');
  });

  it('setViewMode patches view_mode', () => {
    const preset = presetWith();
    const { setPreset, getPreset } = captureSetPreset(preset);
    const { setViewMode } = useStudioState(preset, setPreset);
    setViewMode('Left');
    expect(getPreset().studio?.view_mode).toBe('Left');
  });

  it('setBackgroundId patches background_id', () => {
    const preset = presetWith();
    const { setPreset, getPreset } = captureSetPreset(preset);
    const { setBackgroundId } = useStudioState(preset, setPreset);
    setBackgroundId('tech-dark');
    expect(getPreset().studio?.background_id).toBe('tech-dark');
  });

  it('setFrameStyle patches frame_style', () => {
    const preset = presetWith();
    const { setPreset, getPreset } = captureSetPreset(preset);
    const { setFrameStyle } = useStudioState(preset, setPreset);
    setFrameStyle('matte-white');
    expect(getPreset().studio?.frame_style).toBe('matte-white');
  });

  it('preserves existing studio fields when patching one', () => {
    const preset = presetWith({ studio: { ...DEFAULT_STUDIO_PRESET, view_mode: 'Right' } });
    const { setPreset, getPreset } = captureSetPreset(preset);
    const { setFrameStyle } = useStudioState(preset, setPreset);
    setFrameStyle('gloss-white');
    const studio = getPreset().studio!;
    expect(studio.frame_style).toBe('gloss-white');
    expect(studio.view_mode).toBe('Right');
  });

  it('immutable — original preset is not mutated', () => {
    const preset = presetWith();
    const original = JSON.stringify(preset);
    const { setPreset } = captureSetPreset(preset);
    const { setFrameFamily } = useStudioState(preset, setPreset);
    setFrameFamily('acrylic');
    expect(JSON.stringify(preset)).toBe(original);
  });
});
