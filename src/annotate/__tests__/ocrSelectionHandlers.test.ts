import { describe, it, expect, vi } from 'vitest';
import { beginOcrSelection, completeOcrSelection } from '../pointer/ocrSelectionHandlers';
import { isTesseractWorkerReady } from '../../ocr/tesseractWorker';

vi.mock('../../ocr/tesseractWorker', () => ({
  isTesseractWorkerReady: vi.fn(),
}));

describe('ocrSelectionHandlers', () => {
  it('begins OCR selection by clearing state and returning a drawing object', () => {
    const setOcrRegion = vi.fn();
    const setOcrStatus = vi.fn();
    const setOcrProgress = vi.fn();
    const setOcrText = vi.fn();
    const setOcrError = vi.fn();

    const drawing = beginOcrSelection(12, 34, {
      setOcrRegion,
      setOcrStatus,
      setOcrProgress,
      setOcrText,
      setOcrError,
    });

    expect(setOcrRegion).toHaveBeenCalledWith(null);
    expect(setOcrProgress).toHaveBeenCalledWith(0);
    expect(setOcrText).toHaveBeenCalledWith('');
    expect(setOcrError).toHaveBeenCalledWith(null);
    expect(setOcrStatus).toHaveBeenCalledWith('selecting');
    expect(drawing).toEqual({
      type: 'ocr_selection',
      start: { x: 12, y: 34 },
      end: { x: 12, y: 34 },
    });
  });

  it('completes OCR selection with normalized coordinates and starts extraction', async () => {
    const setOcrRegion = vi.fn();
    const setOcrStatus = vi.fn();
    const setOcrProgress = vi.fn();
    const setOcrText = vi.fn();
    const setOcrError = vi.fn();
    const extractText = vi.fn().mockImplementation((_canvas, _region, hooks) => {
      hooks.onWorkerReady();
      return Promise.resolve('recognized text');
    });
    const ocrRequestIdRef = { current: 0 };
    const canvas = { width: 200, height: 100 } as HTMLCanvasElement;

    vi.mocked(isTesseractWorkerReady).mockReturnValue(true);

    await completeOcrSelection(
      {
        type: 'ocr_selection',
        start: { x: 80, y: 60 },
        end: { x: 20, y: 10 },
      },
      {
        compositionCanvas: canvas,
        setOcrRegion,
        setOcrStatus,
        setOcrProgress,
        setOcrText,
        setOcrError,
        ocrRequestIdRef,
        extractText,
      }
    );

    expect(setOcrRegion).toHaveBeenCalledWith({ x: 20, y: 10, width: 60, height: 50 });
    expect(setOcrStatus).toHaveBeenCalledWith('running');
    expect(setOcrText).toHaveBeenCalledWith('');
    expect(setOcrError).toHaveBeenCalledWith(null);
    expect(extractText).toHaveBeenCalled();
    expect(setOcrText).toHaveBeenLastCalledWith('recognized text');
    expect(setOcrStatus).toHaveBeenLastCalledWith('ready');
    expect(ocrRequestIdRef.current).toBe(1);
  });

  it('completes OCR selection with loading state when worker is not ready', async () => {
    const setOcrRegion = vi.fn();
    const setOcrStatus = vi.fn();
    const setOcrProgress = vi.fn();
    const setOcrText = vi.fn();
    const setOcrError = vi.fn();
    const extractText = vi.fn().mockImplementation((_canvas, _region, hooks) => {
      hooks.onProgress(50);
      hooks.onWorkerReady();
      return Promise.resolve('cold text');
    });
    const ocrRequestIdRef = { current: 0 };
    const canvas = { width: 200, height: 100 } as HTMLCanvasElement;

    vi.mocked(isTesseractWorkerReady).mockReturnValue(false);

    await completeOcrSelection(
      {
        type: 'ocr_selection',
        start: { x: 10, y: 10 },
        end: { x: 50, y: 50 },
      },
      {
        compositionCanvas: canvas,
        setOcrRegion,
        setOcrStatus,
        setOcrProgress,
        setOcrText,
        setOcrError,
        ocrRequestIdRef,
        extractText,
      }
    );

    expect(setOcrStatus).toHaveBeenCalledWith('loading');
    expect(setOcrProgress).toHaveBeenCalledWith(50);
    expect(setOcrStatus).toHaveBeenCalledWith('running');
    expect(setOcrStatus).toHaveBeenLastCalledWith('ready');
    expect(setOcrText).toHaveBeenLastCalledWith('cold text');
  });

  it('handles OCR errors gracefully', async () => {
    const setOcrRegion = vi.fn();
    const setOcrStatus = vi.fn();
    const setOcrProgress = vi.fn();
    const setOcrText = vi.fn();
    const setOcrError = vi.fn();
    const extractText = vi.fn().mockRejectedValue(new Error('Engine failed'));
    const ocrRequestIdRef = { current: 0 };
    const canvas = { width: 200, height: 100 } as HTMLCanvasElement;

    vi.mocked(isTesseractWorkerReady).mockReturnValue(true);

    await completeOcrSelection(
      {
        type: 'ocr_selection',
        start: { x: 10, y: 10 },
        end: { x: 50, y: 50 },
      },
      {
        compositionCanvas: canvas,
        setOcrRegion,
        setOcrStatus,
        setOcrProgress,
        setOcrText,
        setOcrError,
        ocrRequestIdRef,
        extractText,
      }
    );

    expect(setOcrStatus).toHaveBeenLastCalledWith('error');
    expect(setOcrError).toHaveBeenCalledWith('Engine failed');
  });

  it('returns to idle for tiny OCR selections', () => {
    const setOcrRegion = vi.fn();
    const setOcrStatus = vi.fn();
    const setOcrProgress = vi.fn();
    const setOcrText = vi.fn();
    const setOcrError = vi.fn();
    const extractText = vi.fn();

    const result = completeOcrSelection(
      {
        type: 'ocr_selection',
        start: { x: 10, y: 10 },
        end: { x: 14, y: 15 },
      },
      {
        compositionCanvas: null,
        setOcrRegion,
        setOcrStatus,
        setOcrProgress,
        setOcrText,
        setOcrError,
        ocrRequestIdRef: { current: 0 },
        extractText,
      }
    );

    expect(result).toBeNull();
    expect(setOcrRegion).toHaveBeenCalledWith(null);
    expect(setOcrStatus).toHaveBeenCalledWith('idle');
    expect(extractText).not.toHaveBeenCalled();
  });

  it('does not start OCR work when the composition canvas is unavailable', () => {
    const setOcrRegion = vi.fn();
    const setOcrStatus = vi.fn();
    const setOcrProgress = vi.fn();
    const setOcrText = vi.fn();
    const setOcrError = vi.fn();
    const extractText = vi.fn();

    const result = completeOcrSelection(
      {
        type: 'ocr_selection',
        start: { x: 10, y: 10 },
        end: { x: 30, y: 40 },
      },
      {
        compositionCanvas: null,
        setOcrRegion,
        setOcrStatus,
        setOcrProgress,
        setOcrText,
        setOcrError,
        ocrRequestIdRef: { current: 0 },
        extractText,
      }
    );

    expect(result).toBeNull();
    expect(extractText).not.toHaveBeenCalled();
    expect(setOcrRegion).not.toHaveBeenCalled();
    expect(setOcrStatus).not.toHaveBeenCalledWith('running');
  });
});
