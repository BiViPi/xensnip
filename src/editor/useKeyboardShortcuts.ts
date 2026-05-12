import { useEffect } from 'react';
import { useAnnotationStore } from '../annotate/state/store';
import { recordHistorySnapshot, withHistorySuspended } from './historyBridge';

interface KeyboardShortcutsOptions {
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useKeyboardShortcuts({ onUndo, onRedo }: KeyboardShortcutsOptions = {}) {
  const { selectedIds, select, removeObjects, setActiveTool, activeTool, nudgeObject } = useAnnotationStore();

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
      if (selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0;
        const dy = e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0;
        recordHistorySnapshot();
        withHistorySuspended(() => {
          selectedIds.forEach(id => nudgeObject(id, dx, dy));
        });
        return;
      }

      if (e.key === 'Escape') {
        if (selectedIds.length > 0) {
          select(null);
          setActiveTool('select');
        } else if (activeTool !== 'select') {
          setActiveTool('select');
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        removeObjects(selectedIds);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, select, removeObjects, setActiveTool, activeTool, onUndo, onRedo, nudgeObject]);
}
