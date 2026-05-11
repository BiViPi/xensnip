import { AnnotationSnapshot } from '../../annotate/state/store';
import { RectangleObject } from '../../annotate/state/types';
import {
  DocumentUndoSnapshot,
  ScreenshotDocument,
} from '../../editor/useScreenshotDocuments';
import { CropBounds } from '../../editor/useCropTool';

export function createMockImage(src = 'mock-image'): HTMLImageElement {
  const image = new Image();
  image.src = src;
  return image;
}

export function createRectangleObject(id = 'obj-1'): RectangleObject {
  return {
    id,
    type: 'rectangle',
    x: 0,
    y: 0,
    rotation: 0,
    draggable: true,
    width: 10,
    height: 10,
    stroke: '#ef4444',
    strokeWidth: 2,
    lineStyle: 'solid',
    cornerRadius: 0,
  };
}

export function createAnnotationSnapshot(
  overrides: Partial<AnnotationSnapshot> = {}
): AnnotationSnapshot {
  return {
    activeTool: 'select',
    objects: [],
    selectedId: null,
    editingTextId: null,
    toolbarCollapsed: false,
    ...overrides,
  };
}

export function createUndoSnapshot(
  overrides: Partial<DocumentUndoSnapshot> = {}
): DocumentUndoSnapshot {
  return {
    imageSrc: 'data:image/png;base64,undo',
    annotation: createAnnotationSnapshot(),
    cropBounds: null,
    ...overrides,
  };
}

export function createCropBounds(
  overrides: Partial<CropBounds> = {}
): CropBounds {
  return {
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    ...overrides,
  };
}

export function createScreenshotDocument(
  id: string,
  overrides: Partial<ScreenshotDocument> = {}
): ScreenshotDocument {
  return {
    id,
    image: createMockImage(`image:${id}`),
    blobUrl: `blob:${id}`,
    thumbnailSrc: `thumb:${id}`,
    annotation: createAnnotationSnapshot(),
    cropBounds: null,
    isExportChecked: false,
    undoStack: [],
    redoStack: [],
    createdAt: Number(id) || Date.now(),
    ...overrides,
  };
}
