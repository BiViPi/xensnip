import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuickBar } from '../QuickBar';
import type { EditorPreset } from '../../compose/preset';
import type { ScreenshotDocument } from '../useScreenshotDocuments';
import type { Settings } from '../../ipc/types';
import { createCanvasDocument, createCanvasImageObject } from '../canvasDocument';

const {
  composeToBlob,
  composeDocumentToBytes,
  composeWithAnnotations,
  clipboardWriteImage,
  exportSaveMedia,
  openSettingsWindow,
  quickAccessSetBusy,
  exportStudioPng,
} = vi.hoisted(() => ({
  composeToBlob: vi.fn(),
  composeDocumentToBytes: vi.fn(),
  composeWithAnnotations: vi.fn(),
  clipboardWriteImage: vi.fn(),
  exportSaveMedia: vi.fn(),
  openSettingsWindow: vi.fn(),
  quickAccessSetBusy: vi.fn(),
  exportStudioPng: vi.fn(),
}));

const annotationState = {
  objects: [] as unknown[],
  clearAll: vi.fn(),
};

vi.mock('../../compose/compose', () => ({
  composeToBlob,
  composeDocumentToBytes,
}));

vi.mock('../../compose/composeWithAnnotations', () => ({
  composeWithAnnotations,
}));

vi.mock('../../ipc/index', () => ({
  clipboardWriteImage,
  exportSaveMedia,
  openSettingsWindow,
  quickAccessSetBusy,
}));

vi.mock('@studio-impl/export/exportStudio', () => ({
  exportStudioPng,
}));

vi.mock('../../annotate/state/store', () => ({
  useHasAnnotations: () => false,
  useAnnotationStore: (selector: (state: typeof annotationState) => unknown) => selector(annotationState),
}));

vi.mock('../Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

vi.mock('../../studio/ui/StudioQuickBar', () => ({
  StudioQuickBar: () => React.createElement('div', { 'data-testid': 'studio-quickbar' }),
}));

function iconMock() {
  return React.createElement('span', { 'aria-hidden': 'true' });
}

vi.mock('../../components/icons', () => ({
  RatioIcon: iconMock,
  BackgroundIcon: iconMock,
  PaddingIcon: iconMock,
  RadiusIcon: iconMock,
  ShadowIcon: iconMock,
  PresetIcon: iconMock,
  ChevronIcon: iconMock,
  CopyIcon: iconMock,
  ExportIcon: iconMock,
  SettingsIcon: iconMock,
}));

const preset: EditorPreset = {
  background: 'Preset',
  bg_mode: 'Solid',
  bg_value: '#000000',
  bg_colors: ['#000000'],
  bg_gradient_type: 'Linear',
  bg_angle: 135,
  bg_radius: 50,
  padding: 24,
  radius: 12,
  shadow_enabled: false,
  shadow_blur: 12,
  shadow_opacity: 0.35,
  shadow_angle: 135,
  shadow_offset: 8,
  border_width: 0,
  border_color: 'rgba(0,0,0,0)',
  ratio: '16:9',
  presentation_mode: 'flat',
  studio: undefined,
};

const image = { width: 1280, height: 720 } as HTMLImageElement;
const annotation = {
  activeTool: 'select' as const,
  objects: [],
  selectedIds: [],
  editingTextId: null,
  toolbarCollapsed: false,
};
const activeDocument: ScreenshotDocument = {
  id: 'doc-1',
  filename: 'capture.png',
  image,
  canvas: createCanvasDocument(createCanvasImageObject({
    image,
    blobUrl: 'blob:active',
  })),
  blobUrl: 'blob:active',
  thumbnailSrc: 'blob:thumb',
  preset,
  isExportChecked: false,
  assetId: undefined,
  annotation,
  cropBounds: null,
  undoStack: [],
  redoStack: [],
  createdAt: 1,
};

const otherDocument: ScreenshotDocument = {
  ...activeDocument,
  id: 'doc-2',
  filename: 'other.png',
  blobUrl: 'blob:other',
  isExportChecked: true,
};

const settings: Settings = {
  version: 11,
  hotkeys: {
    region: 'Ctrl+Shift+4',
    active_window: 'Ctrl+Shift+5',
  },
  theme: 'dark',
  launch_at_startup: false,
  capture_delay_seconds: 0,
  capture_all_monitors: false,
  print_screen_capture_enabled: false,
  export_folder: 'E:/Exports',
  export_format: 'JPEG',
  play_copy_sound: false,
  play_save_sound: false,
  saved_presets: [],
  last_preset: null,
  default_preset_id: null,
  default_presentation_mode: 'flat',
};

function renderQuickBar(overrides: Partial<React.ComponentProps<typeof QuickBar>> = {}) {
  return render(
    React.createElement(QuickBar, {
      preset,
      setPreset: vi.fn(),
      image,
      isActionInFlight: false,
      setIsActionInFlight: vi.fn(),
      showToast: vi.fn(),
      activePop: null,
      onActivePopChange: vi.fn(),
      settings,
      onRefreshSettings: vi.fn(),
      onOpenPresetManager: vi.fn(),
      documents: [activeDocument],
      activeDocument,
      onClearAllSession: vi.fn(),
      onFlush: vi.fn(),
      presentationMode: 'flat',
      onPresentationModeChange: vi.fn(),
      studioExportHandle: null,
      ...overrides,
    }),
  );
}

describe('QuickBar studio export integration', () => {
  beforeEach(() => {
    composeToBlob.mockReset();
    composeDocumentToBytes.mockReset();
    composeWithAnnotations.mockReset();
    clipboardWriteImage.mockReset();
    exportSaveMedia.mockReset();
    openSettingsWindow.mockReset();
    quickAccessSetBusy.mockReset();
    exportStudioPng.mockReset();
    annotationState.clearAll.mockReset();
    annotationState.objects = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a loading toast instead of falling back to flat copy when studio handle is unavailable', () => {
    const showToast = vi.fn();
    renderQuickBar({
      showToast,
      presentationMode: 'studio',
      studioExportHandle: null,
    });

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    expect(showToast).toHaveBeenCalledWith('Studio is still loading', 'error');
    expect(exportStudioPng).not.toHaveBeenCalled();
    expect(composeToBlob).not.toHaveBeenCalled();
    expect(composeWithAnnotations).not.toHaveBeenCalled();
    expect(clipboardWriteImage).not.toHaveBeenCalled();
  });

  it('forces active-document PNG export and warns when batch export is requested in studio mode', async () => {
    const showToast = vi.fn();
    exportStudioPng.mockResolvedValue(new Uint8Array([1, 2, 3]));
    exportSaveMedia.mockResolvedValue(undefined);

    renderQuickBar({
      showToast,
      presentationMode: 'studio',
      studioExportHandle: { isReady: true, exportPng: vi.fn() },
      documents: [
        { ...activeDocument, isExportChecked: true },
        otherDocument,
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await vi.waitFor(() => {
      expect(exportStudioPng).toHaveBeenCalledTimes(1);
    });

    expect(showToast).toHaveBeenNthCalledWith(
      1,
      'Batch export is not supported in Studio mode - exporting active capture.',
      'error',
    );
    expect(exportSaveMedia).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      'E:/Exports',
      'capture.png',
      true,
    );
    expect(composeToBlob).not.toHaveBeenCalled();
    expect(composeDocumentToBytes).not.toHaveBeenCalled();
  });

  it('uses each document preset during flat batch export', async () => {
    const showToast = vi.fn();
    composeDocumentToBytes.mockResolvedValue(new Uint8Array([9, 9, 9]));
    exportSaveMedia.mockResolvedValue(undefined);

    const studioDoc = {
      ...otherDocument,
      preset: {
        ...preset,
        presentation_mode: 'studio' as const,
      },
    };

    renderQuickBar({
      showToast,
      documents: [activeDocument, studioDoc],
    });

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await vi.waitFor(() => {
      expect(composeDocumentToBytes).toHaveBeenCalledWith(studioDoc, 'image/jpeg', 1);
    });
  });

  it('marks the quick access session busy around copy actions', async () => {
    composeToBlob.mockResolvedValue(new Uint8Array([4, 5, 6]));
    clipboardWriteImage.mockResolvedValue(undefined);

    renderQuickBar();

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await vi.waitFor(() => {
      expect(quickAccessSetBusy).toHaveBeenNthCalledWith(1, 'quick_access_session', true);
    });
    await vi.waitFor(() => {
      expect(quickAccessSetBusy).toHaveBeenLastCalledWith('quick_access_session', false);
    });
    expect(clipboardWriteImage).toHaveBeenCalledWith(new Uint8Array([4, 5, 6]));
  });
});
