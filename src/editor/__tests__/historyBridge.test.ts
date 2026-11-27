import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginHistoryGesture,
  endHistoryGesture,
  recordHistorySnapshot,
  registerHistoryRecorder,
  resetHistoryGestures,
} from '../historyBridge';
import { SliderToggle } from '../../annotate/floating/SliderToggle';
import { useAnnotationStore } from '../../annotate/state/store';

describe('historyBridge gesture coalescing (T002, T004, T005)', () => {
  afterEach(() => {
    cleanup();
    resetHistoryGestures();
    registerHistoryRecorder(null);
  });

  it('records 0 snapshots if a gesture starts and ends without mutations', () => {
    const recorder = vi.fn();
    registerHistoryRecorder(recorder);

    beginHistoryGesture();
    endHistoryGesture();

    expect(recorder).not.toHaveBeenCalled();
  });

  it('coalesces 20 rapid mutations during a gesture into exactly 1 undo snapshot', () => {
    const recorder = vi.fn();
    registerHistoryRecorder(recorder);

    beginHistoryGesture();
    for (let i = 0; i < 20; i++) {
      recordHistorySnapshot();
    }
    endHistoryGesture();

    expect(recorder).toHaveBeenCalledTimes(1);

    // Next normal mutation outside the gesture records again cleanly
    recordHistorySnapshot();
    expect(recorder).toHaveBeenCalledTimes(2);
  });

  it('handles nested gestures without recording extra snapshots until all end', () => {
    const recorder = vi.fn();
    registerHistoryRecorder(recorder);

    beginHistoryGesture();
    beginHistoryGesture();
    recordHistorySnapshot();
    endHistoryGesture();
    recordHistorySnapshot();
    endHistoryGesture();

    expect(recorder).toHaveBeenCalledTimes(1);
  });

  it('SliderToggle records exactly 1 snapshot across continuous range slider drag', () => {
    const recorder = vi.fn();
    registerHistoryRecorder(recorder);
    useAnnotationStore.setState({
      objects: [
        {
          id: 'blur-1',
          type: 'blur',
          x: 10,
          y: 10,
          width: 100,
          height: 50,
          blurRadius: 10,
          rotation: 0,
          draggable: true,
        },
      ],
      selectedIds: ['blur-1'],
    });

    render(
      React.createElement(SliderToggle, {
        value: 10,
        min: 1,
        max: 50,
        isOpen: true,
        onToggle: vi.fn(),
        onChange: (val) => useAnnotationStore.getState().updateObject('blur-1', { blurRadius: val }),
        title: 'Blur Intensity',
      })
    );

    const slider = screen.getByRole('slider');
    fireEvent.mouseDown(slider);
    for (let val = 11; val <= 30; val++) {
      fireEvent.change(slider, { target: { value: String(val) } });
    }
    fireEvent.mouseUp(window);

    expect(recorder).toHaveBeenCalledTimes(1);
    const updated = useAnnotationStore.getState().objects[0];
    expect(updated?.type === 'blur' ? updated.blurRadius : -1).toBe(30);
  });
});
