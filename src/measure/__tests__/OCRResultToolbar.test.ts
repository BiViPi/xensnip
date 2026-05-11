import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { OCRResultToolbar } from '../OCRResultToolbar';
import { useMeasureStore } from '../store';

describe('OCRResultToolbar', () => {
  beforeEach(() => {
    const overlay = document.createElement('div');
    overlay.id = 'annotation-ui-overlay';
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
});
