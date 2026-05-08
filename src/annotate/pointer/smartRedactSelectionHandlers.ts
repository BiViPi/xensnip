import { DrawingRedact } from '../state/drawingTypes';
import { normalizeRect } from './selectionRect';

const MIN_SELECTION_SIZE = 5;

interface SmartRedactSelectionStartDeps {
  resetPrivacy: () => void;
  setPrivacyStatus: (status: 'idle' | 'ready' | 'error' | 'detecting') => void;
}

interface SmartRedactSelectionCompleteDeps {
  setPrivacyStatus: (status: 'idle' | 'ready' | 'error' | 'detecting') => void;
  setSelectionRect: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  setScope: (scope: 'full_canvas' | 'selection') => void;
}

export function beginSmartRedactSelection(
  stageX: number,
  stageY: number,
  deps: SmartRedactSelectionStartDeps
): DrawingRedact {
  deps.resetPrivacy();
  deps.setPrivacyStatus('idle');

  return {
    type: 'smart_redact_selection',
    start: { x: stageX, y: stageY },
    end: { x: stageX, y: stageY },
  };
}

export function completeSmartRedactSelection(
  drawingObject: DrawingRedact,
  deps: SmartRedactSelectionCompleteDeps
): void {
  const selection = normalizeRect(drawingObject.start, drawingObject.end);
  if (selection.width > MIN_SELECTION_SIZE && selection.height > MIN_SELECTION_SIZE) {
    deps.setScope('selection');
    deps.setSelectionRect(selection);
    deps.setPrivacyStatus('idle');
    return;
  }

  deps.setSelectionRect(null);
  deps.setScope('full_canvas');
}
