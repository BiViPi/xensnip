import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditorUndoStack } from '../useEditorUndoStack';

// Mock Image global
class MockImage {
  src: string = '';
  onload: () => void = () => {};
  constructor() {
    setTimeout(() => { if (this.onload) this.onload(); }, 0);
  }
}
(global as any).Image = MockImage;

describe('useEditorUndoStack Redo support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createProps = (src: string, setImage?: any) => ({
    image: { src } as HTMLImageElement,
    cropBounds: null,
    setImage: setImage || vi.fn(),
    setCropBounds: vi.fn(),
  });

  it('redo after undo restores the state before undo', async () => {
    const setImage = vi.fn();
    const { result, rerender } = renderHook(
      (props) => useEditorUndoStack(props),
      { initialProps: createProps('data:initial', setImage) }
    );

    // 1. We are at 'initial'. An action is about to happen. 
    // Record current state ('initial') before changing it.
    act(() => {
      result.current.pushHistorySnapshot();
    });
    // undoStack: ['data:initial']

    // 2. Change state to 'modified'
    rerender(createProps('data:modified', setImage));
    // Current state is now 'data:modified'
    
    // 3. Undo
    // handleUndo should:
    // - Pop 'data:initial' from undoStack
    // - Capture current state ('data:modified') and push to redoStack
    // - setImage('data:initial')
    await act(async () => {
      await result.current.handleUndo();
    });

    expect(setImage).toHaveBeenCalledWith(expect.objectContaining({ src: 'data:initial' }));
    expect(result.current.redoStackRef.current[0].imageSrc).toBe('data:modified');

    // 4. Redo
    // Simulate component rerender after undo (it would now have 'data:initial')
    rerender(createProps('data:initial', setImage));

    // handleRedo should:
    // - Pop 'data:modified' from redoStack
    // - Capture current state ('data:initial') and push back to undoStack
    // - setImage('data:modified')
    await act(async () => {
      await result.current.handleRedo();
    });

    expect(setImage).toHaveBeenLastCalledWith(expect.objectContaining({ src: 'data:modified' }));
    expect(result.current.undoStackRef.current).toHaveLength(1);
    expect(result.current.undoStackRef.current[0].imageSrc).toBe('data:initial');
  });

  it('redo stack caps at HISTORY_LIMIT', async () => {
    const { result, rerender } = renderHook(
      (props) => useEditorUndoStack(props),
      { initialProps: createProps('data:start') }
    );

    // Fill undo stack with 50 items
    for (let i = 0; i < 60; i++) {
      rerender(createProps(`data:${i}`));
      act(() => result.current.pushHistorySnapshot());
    }

    // undoStack should have 50 items
    expect(result.current.undoStackRef.current).toHaveLength(50);

    // Undo all of them
    for (let i = 0; i < 50; i++) {
      await act(async () => await result.current.handleUndo());
    }

    expect(result.current.redoStackRef.current).toHaveLength(50);
  });
});
