import { renderHook, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useAnnotationStore } from '../../annotate/state/store';

describe('useKeyboardShortcuts routing', () => {
  const triggerKey = (key: string, modifiers: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean } = {}) => {
    const event = new KeyboardEvent('keydown', { key, ...modifiers, bubbles: true });
    window.dispatchEvent(event);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('Ctrl+Z without Shift calls onUndo', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo }));

    triggerKey('z', { ctrlKey: true });
    expect(onUndo).toHaveBeenCalled();
  });

  it('Ctrl+Z with Shift calls onRedo only', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo, onRedo }));

    triggerKey('z', { ctrlKey: true, shiftKey: true });
    expect(onRedo).toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('Arrow keys call nudgeObject when an annotation is selected', () => {
    const nudgeObject = vi.fn();
    useAnnotationStore.setState({ selectedIds: ['obj-1'], nudgeObject });
    
    renderHook(() => useKeyboardShortcuts());

    triggerKey('ArrowRight');
    expect(nudgeObject).toHaveBeenCalledWith('obj-1', 1, 0);

    triggerKey('ArrowDown', { shiftKey: true });
    expect(nudgeObject).toHaveBeenCalledWith('obj-1', 0, 10);
  });

  it('Arrow keys do nothing when an input element has focus', () => {
    const nudgeObject = vi.fn();
    useAnnotationStore.setState({ selectedIds: ['obj-1'], nudgeObject });
    
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Mock focus check logic in the component
    // In our implementation: e.target instanceof HTMLInputElement
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    Object.defineProperty(event, 'target', { writable: false, value: input });
    window.dispatchEvent(event);

    expect(nudgeObject).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
