import { describe, it, expect, vi } from 'vitest';
import {
  beginSmartRedactSelection,
  completeSmartRedactSelection,
} from '../pointer/smartRedactSelectionHandlers';

describe('smartRedactSelectionHandlers', () => {
  it('begins Smart Redact selection by resetting privacy state', () => {
    const resetPrivacy = vi.fn();
    const setPrivacyStatus = vi.fn();

    const drawing = beginSmartRedactSelection(25, 35, {
      resetPrivacy,
      setPrivacyStatus,
    });

    expect(resetPrivacy).toHaveBeenCalled();
    expect(setPrivacyStatus).toHaveBeenCalledWith('idle');
    expect(drawing).toEqual({
      type: 'smart_redact_selection',
      start: { x: 25, y: 35 },
      end: { x: 25, y: 35 },
    });
  });

  it('completes Smart Redact selection with a normalized selection rect', () => {
    const setPrivacyStatus = vi.fn();
    const setSelectionRect = vi.fn();
    const setScope = vi.fn();

    completeSmartRedactSelection(
      {
        type: 'smart_redact_selection',
        start: { x: 100, y: 90 },
        end: { x: 20, y: 10 },
      },
      {
        setPrivacyStatus,
        setSelectionRect,
        setScope,
      }
    );

    expect(setScope).toHaveBeenCalledWith('selection');
    expect(setSelectionRect).toHaveBeenCalledWith({ x: 20, y: 10, width: 80, height: 80 });
    expect(setPrivacyStatus).toHaveBeenCalledWith('idle');
  });

  it('clears Smart Redact selection for tiny drags', () => {
    const setPrivacyStatus = vi.fn();
    const setSelectionRect = vi.fn();
    const setScope = vi.fn();

    completeSmartRedactSelection(
      {
        type: 'smart_redact_selection',
        start: { x: 5, y: 5 },
        end: { x: 9, y: 10 },
      },
      {
        setPrivacyStatus,
        setSelectionRect,
        setScope,
      }
    );

    expect(setSelectionRect).toHaveBeenCalledWith(null);
    expect(setScope).toHaveBeenCalledWith('full_canvas');
    expect(setPrivacyStatus).not.toHaveBeenCalledWith('idle');
  });
});
