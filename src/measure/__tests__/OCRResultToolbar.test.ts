import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OCRResultToolbar } from '../OCRResultToolbar';
import { useMeasureStore } from '../store';

describe('OCRResultToolbar (T032, T036)', () => {
  beforeEach(() => {
    const overlay = document.createElement('div');
    overlay.id = 'annotation-ui-overlay';
    Object.defineProperty(overlay, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(overlay, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(overlay);

    useMeasureStore.setState({
      activeUtility: 'ocr_extract',
      ocrRegion: { x: 10, y: 20, width: 80, height: 30 },
      ocrText: '',
      ocrStatus: 'idle',
      ocrProgress: 0,
      ocrError: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.getElementById('annotation-ui-overlay')?.remove();
    useMeasureStore.setState({
      activeUtility: null,
      ocrRegion: null,
      ocrText: '',
      ocrStatus: 'idle',
      ocrProgress: 0,
      ocrError: null,
    });
  });

  it('shows idle drag guidance when ocr_extract is active before selection starts and dismisses cleanly', () => {
    const onDismiss = vi.fn();
    useMeasureStore.setState({
      activeUtility: 'ocr_extract',
      ocrRegion: null,
      ocrStatus: 'idle',
    });

    render(React.createElement(OCRResultToolbar, { onDismiss, scale: 1 }));
    expect(screen.getByText('Drag on canvas to select area')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Dismiss OCR result'));
    expect(useMeasureStore.getState().activeUtility).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders loading progress during first-use OCR initialization', () => {
    useMeasureStore.setState({
      ocrStatus: 'loading',
      ocrProgress: 42,
    });

    render(React.createElement(OCRResultToolbar, { onDismiss: () => {}, scale: 1 }));

    expect(screen.getByText('Loading 42%')).toBeTruthy();
  });

  it('renders the OCR error message and keeps the full text in title', () => {
    const errorText =
      'OCR engine failed to load. On first use, OCR requires an internet connection to download model files.';

    useMeasureStore.setState({
      ocrStatus: 'error',
      ocrError: errorText,
    });

    render(React.createElement(OCRResultToolbar, { onDismiss: () => {}, scale: 1 }));

    const chip = screen.getByTitle(errorText);
    expect(chip.textContent).toContain('OCR engine failed to load.');
    expect(chip.textContent?.endsWith('...')).toBe(true);
  });

  it('treats whitespace-only OCR output as empty and copies trimmed text with preview when ready', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    useMeasureStore.setState({
      ocrStatus: 'ready',
      ocrText: '   \n\t  ',
    });

    const { rerender } = render(React.createElement(OCRResultToolbar, { onDismiss: () => {}, scale: 1 }));
    expect(screen.getByText('No text detected')).toBeTruthy();
    expect((screen.getByRole('button', { name: /No text detected/i }) as HTMLButtonElement).disabled).toBe(true);

    useMeasureStore.setState({
      ocrStatus: 'ready',
      ocrText: '  Hello XenSnip OCR \n ',
    });
    rerender(React.createElement(OCRResultToolbar, { onDismiss: () => {}, scale: 1 }));

    expect(screen.getByText('Hello XenSnip OCR')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Copy Text/i }));
    expect(writeText).toHaveBeenCalledWith('Hello XenSnip OCR');
  });
});
