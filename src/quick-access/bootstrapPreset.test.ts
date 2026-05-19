import { describe, it, expect } from 'vitest';
import { resolveBootstrapPreset } from './useAssetBootstrap';
import { DEFAULT_PRESET } from '../compose/preset';
import type { Settings } from '../ipc/types';

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    version: 9,
    hotkeys: { region: 'Ctrl+Shift+S', active_window: 'Ctrl+Alt+W' },
    theme: 'dark',
    launch_at_startup: false,
    capture_delay_seconds: 0,
    play_copy_sound: true,
    play_save_sound: true,
    export_folder: null,
    export_format: 'PNG',
    capture_all_monitors: true,
    saved_presets: [],
    last_preset: null,
    default_preset_id: null,
    default_presentation_mode: 'flat',
    ...overrides,
  };
}

describe('resolveBootstrapPreset — bootstrap precedence (plan §17)', () => {
  // Branch 1: last_preset exists
  it('uses last_preset.presentation_mode when last_preset is set', () => {
    const settings = makeSettings({
      last_preset: { ...DEFAULT_PRESET, presentation_mode: 'studio' },
    });
    const result = resolveBootstrapPreset(settings, 1920, 1080);
    expect(result.presentation_mode).toBe('studio');
  });

  it('branch 1 — last_preset overrides default_presentation_mode', () => {
    const settings = makeSettings({
      default_presentation_mode: 'flat',
      last_preset: { ...DEFAULT_PRESET, presentation_mode: 'studio' },
    });
    const result = resolveBootstrapPreset(settings, 1920, 1080);
    expect(result.presentation_mode).toBe('studio');
  });

  // Branch 2: default_preset_id set and found
  it('uses saved preset when default_preset_id is set and found', () => {
    const savedPreset = { ...DEFAULT_PRESET, presentation_mode: 'studio' as const, padding: 64 };
    const settings = makeSettings({
      default_preset_id: 'preset-1',
      saved_presets: [{ id: 'preset-1', name: 'Studio', preset: savedPreset, updated_at: '' }],
    });
    const result = resolveBootstrapPreset(settings, 1920, 1080);
    expect(result.presentation_mode).toBe('studio');
    expect(result.padding).toBe(64);
  });

  // Branch 3: default_preset_id set but not found — falls to settings.default_presentation_mode
  it('branch 3 — applies settings.default_presentation_mode when preset not found', () => {
    const settings = makeSettings({
      default_preset_id: 'missing-id',
      saved_presets: [],
      default_presentation_mode: 'studio',
    });
    const result = resolveBootstrapPreset(settings, 1920, 1080);
    expect(result.presentation_mode).toBe('studio');
  });

  // Branch 4: no preset at all — uses settings.default_presentation_mode
  it('branch 4 — applies settings.default_presentation_mode when no preset is saved', () => {
    const settings = makeSettings({ default_presentation_mode: 'studio' });
    const result = resolveBootstrapPreset(settings, 1920, 1080);
    expect(result.presentation_mode).toBe('studio');
  });

  it('branch 4 — defaults to flat when settings.default_presentation_mode is flat', () => {
    const settings = makeSettings({ default_presentation_mode: 'flat' });
    const result = resolveBootstrapPreset(settings, 1920, 1080);
    expect(result.presentation_mode).toBe('flat');
  });

  it('branch 4 — defaults to flat when settings is null', () => {
    const result = resolveBootstrapPreset(null, 1920, 1080);
    expect(result.presentation_mode).toBe('flat');
  });
});
