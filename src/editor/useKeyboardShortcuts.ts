import { useEffect } from 'react';
import { useAnnotationStore } from '../annotate/state/store';

interface KeyboardShortcutsOptions {
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useKeyboardShortcuts({ onUndo, onRedo }: KeyboardShortcutsOptions = {}) {
  const { selectedId, select, removeObject, setActiveTool, activeTool, nudgeObject } = useAnnotationStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Ctrl+Z (no Shift) — undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z — redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Arrow nudge (annotation must be selected)
      if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0;
        const dy = e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0;
        nudgeObject(selectedId, dx, dy);
        return;
      }

      if (e.key === 'Escape') {
        if (selectedId) {
          select(null);
          setActiveTool('select');
        } else if (activeTool !== 'select') {
          setActiveTool('select');
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeObject(selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, select, removeObject, setActiveTool, activeTool, onUndo, onRedo, nudgeObject]);
}
