import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PresetsControl } from '../controls/Presets';
import type { EditorPreset } from '../../compose/preset';
import type { Settings } from '../../ipc/types';
import type { ArrowObject } from '../../annotate/state/types';

const presetSave = vi.fn();

const baseArrow: ArrowObject = {
  id: 'obj-1',
  type: 'arrow',
  x: 10,
  y: 20,
  rotation: 0,
  draggable: true,
  points: [0, 0, 20, 30],
  stroke: '#ef4444',
  strokeWidth: 4,
  pointerLength: 12,
  pointerWidth: 12,
  style: 'solid',
};

const storeState = {
  annotationDefaults: { schema_version: 1 as const },
  objects: [baseArrow],
};

const useAnnotationStoreMock = Object.assign(
  () => storeState,
  { getState: () => storeState }
);

vi.mock('../../ipc/index', () => ({
  presetSave,
  presetDelete: vi.fn(),
  presetRename: vi.fn(),
  presetDuplicate: vi.fn(),
  presetSetDefault: vi.fn(),
  presetExportPack: vi.fn(),
  presetImport: vi.fn(),
}));

vi.mock('../../annotate/state/store', () => ({
  useAnnotationStore: useAnnotationStoreMock,
}));

const basePreset: EditorPreset = {
  background: 'Preset',
  bg_mode: 'Gradient',
  bg_value: 'wp-1',
  bg_colors: ['#4158D0', '#C850C0'],
  bg_gradient_type: 'Linear',
  bg_angle: 135,
  bg_radius: 50,
  ratio: '16:9',
  padding: 76,
  radius: 12,
  shadow_enabled: true,
  shadow_blur: 40,
  shadow_opacity: 0.5,
  shadow_angle: 135,
  shadow_offset: 20,
  border_width: 12,
  border_color: 'rgba(15,23,42,0.8)',
  presentation_mode: 'flat',
  studio: undefined,
  annotation_defaults: undefined,
  placed_annotations: undefined,
};

const settings: Settings = {
  version: 11,
  hotkeys: { region: 'Ctrl+Shift+S', active_window: 'Ctrl+Alt+W' },
  theme: 'dark',
  launch_at_startup: false,
  capture_delay_seconds: 0,
  play_copy_sound: true,
  play_save_sound: true,
  export_folder: null,
  export_format: 'PNG',
  capture_all_monitors: true,
  print_screen_capture_enabled: false,
  saved_presets: [
    {
      id: 'preset-1',
      name: 'test',
      preset: {
        ...basePreset,
        placed_annotations: {
          schema_version: 1,
          objects: [
            { ...baseArrow },
            { ...baseArrow, id: 'obj-2' },
            { ...baseArrow, id: 'obj-3' },
            { ...baseArrow, id: 'obj-4' },
          ],
        },
      },
      updated_at: '',
    },
  ],
  last_preset: null,
  default_preset_id: null,
  default_presentation_mode: 'flat',
};

describe('PresetsControl', () => {
  beforeEach(() => {
    presetSave.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows placed annotation count for saved presets', () => {
    render(
      <PresetsControl
        preset={basePreset}
        settings={settings}
        onApply={vi.fn()}
        onRefresh={vi.fn()}
        showToast={vi.fn()}
        onOpenManager={vi.fn()}
      />
    );

    expect(screen.getByText('A:4')).toBeTruthy();
  });

  it('saves placed annotations into preset JSON', async () => {
    render(
      <PresetsControl
        preset={basePreset}
        settings={{ ...settings, saved_presets: [] }}
        onApply={vi.fn()}
        onRefresh={vi.fn()}
        showToast={vi.fn()}
        onOpenManager={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Preset name...'), {
      target: { value: 'with arrows' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(presetSave).toHaveBeenCalledTimes(1);
    expect(presetSave.mock.calls[0][0].preset.placed_annotations).toMatchObject({
      schema_version: 1,
    });
    expect(presetSave.mock.calls[0][0].preset.placed_annotations.objects).toHaveLength(1);
  });
});
