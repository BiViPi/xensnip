import { useEffect } from 'react';
import { useAnnotationStore } from '../annotate/state/store';

interface KeyboardShortcutsOptions {
  onUndo?: () => void;
}

export function useKeyboardShortcuts({ onUndo }: KeyboardShortcutsOptions = {}) {
  const { selectedId, select, removeObject, setActiveTool, activeTool } = useAnnotationStore();

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

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo?.();
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
  }, [selectedId, select, removeObject, setActiveTool, activeTool, onUndo]);
}
