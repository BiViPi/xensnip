import { getCompositionCoordinates } from '../../measure/coordinates';
import { extractTextFromCanvas } from '../../measure/ocr';
import { DrawingOcr } from '../state/drawingTypes';
import { normalizeRect } from './selectionRect';

const MIN_SELECTION_SIZE = 5;

interface OcrSelectionStartDeps {
  setOcrRegion: (region: { x: number; y: number; width: number; height: number } | null) => void;
  setOcrStatus: (status: 'idle' | 'selecting' | 'running' | 'ready' | 'error') => void;
  setOcrText: (text: string) => void;
  setOcrError: (error: string | null) => void;
}

interface OcrSelectionCompleteDeps extends OcrSelectionStartDeps {
  compositionCanvas: HTMLCanvasElement | null;
  ocrRequestIdRef: { current: number };
  extractText?: typeof extractTextFromCanvas;
}

export function beginOcrSelection(
  stageX: number,
  stageY: number,
  deps: OcrSelectionStartDeps
): DrawingOcr {
  deps.setOcrRegion(null);
  deps.setOcrText('');
  deps.setOcrError(null);
  deps.setOcrStatus('selecting');

  return {
    type: 'ocr_selection',
    start: { x: stageX, y: stageY },
    end: { x: stageX, y: stageY },
  };
}

export function completeOcrSelection(
  drawingObject: DrawingOcr,
  deps: OcrSelectionCompleteDeps
): Promise<void> | null {
  const selection = normalizeRect(drawingObject.start, drawingObject.end);
  if (selection.width <= MIN_SELECTION_SIZE || selection.height <= MIN_SELECTION_SIZE) {
    deps.setOcrRegion(null);
    deps.setOcrStatus('idle');
    return null;
  }

  const canvas = deps.compositionCanvas;
  if (!canvas) {
    return null;
  }

  deps.setOcrRegion(selection);
  deps.setOcrStatus('running');
  deps.setOcrText('');
  deps.setOcrError(null);

  const reqId = ++deps.ocrRequestIdRef.current;
  const region = getCompositionCoordinates(selection.x, selection.y, canvas.width, canvas.height);
  const regionWidth = Math.max(1, Math.min(canvas.width - region.x, Math.ceil(selection.width)));
  const regionHeight = Math.max(1, Math.min(canvas.height - region.y, Math.ceil(selection.height)));
  const requestText = deps.extractText ?? extractTextFromCanvas;

  return requestText(canvas, {
    x: region.x,
    y: region.y,
    width: regionWidth,
    height: regionHeight,
  })
    .then((text) => {
      if (deps.ocrRequestIdRef.current === reqId) {
        deps.setOcrText(text);
        deps.setOcrStatus('ready');
      }
    })
    .catch((err: unknown) => {
      if (deps.ocrRequestIdRef.current === reqId) {
        deps.setOcrError(err instanceof Error ? err.message : 'OCR failed');
        deps.setOcrStatus('error');
      }
    });
}
