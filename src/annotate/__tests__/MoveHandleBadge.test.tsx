import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { MoveHandleBadge } from '../floating/MoveHandleBadge';
import { FloatingToolbarManager } from '../floating/FloatingToolbarManager';
import { useAnnotationStore } from '../state/store';
import { registerHistoryRecorder, resetHistoryGestures } from '../../editor/historyBridge';
import type { ArrowObject, MagnifyObject, RectangleObject, TextObject } from '../state/types';

const ANCHOR = { left: 100, top: 100, width: 120, height: 60 };

const SAMPLE_ARROW: ArrowObject = {
  id: 'arr-1',
  type: 'arrow',
  x: 10,
  y: 20,
  rotation: 0,
  points: [0, 0, 80, 40],
  stroke: '#ef4444',
  strokeWidth: 4,
  pointerLength: 12,
  pointerWidth: 12,
  style: 'solid',
  draggable: true,
};

const SAMPLE_RECT: RectangleObject = {
  id: 'rect-1',
  type: 'rectangle',
  x: 200,
  y: 140,
  rotation: 0,
  width: 100,
  height: 50,
  stroke: '#ef4444',
  strokeWidth: 4,
  lineStyle: 'solid',
  cornerRadius: 4,
  draggable: true,
};

const SAMPLE_TEXT: TextObject = {
  id: 'txt-1',
  type: 'text',
  x: 40,
  y: 50,
  rotation: 0,
  text: 'Hello',
  fontSize: 20,
  fontFamily: 'Inter, sans-serif',
  fill: '#ef4444',
  fontStyle: 'normal',
  align: 'left',
  padding: 4,
  draggable: true,
};

const SAMPLE_MAGNIFY: MagnifyObject = {
  id: 'mag-1',
  type: 'magnify',
  x: 100,
  y: 120,
  rotation: 0,
  width: 120,
  height: 80,
  sourceX: 80,
  sourceY: 90,
  sourceWidth: 60,
  sourceHeight: 40,
  zoom: 2,
  cornerRadius: 12,
  borderOpacity: 1,
  draggable: true,
};

function createOverlay(width = 800, height = 600) {
  const overlay = document.createElement('div');
  overlay.id = 'annotation-ui-overlay';
  Object.defineProperty(overlay, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(overlay, 'clientHeight', { value: height, configurable: true });
  document.body.appendChild(overlay);
  return overlay;
}

describe('MoveHandleBadge & FloatingToolbarManager (Move Handle)', () => {
  let overlayEl: HTMLDivElement;

  beforeEach(() => {
    overlayEl = createOverlay();
    resetHistoryGestures();
    registerHistoryRecorder(null);
    useAnnotationStore.setState({
      objects: [],
      selectedIds: [],
      activeTool: 'select',
      editingTextId: null,
      toolbarCollapsed: false,
    });
  });

  afterEach(() => {
    cleanup();
    resetHistoryGestures();
    registerHistoryRecorder(null);
    overlayEl.remove();
  });

  it('positions the move badge centered 8px below the anchor and moves Arrow + Magnify with scaled coordinates and 1 coalesced history snapshot', () => {
    const recorder = vi.fn();
    registerHistoryRecorder(recorder);

    useAnnotationStore.setState({
      objects: [SAMPLE_ARROW, SAMPLE_MAGNIFY],
      selectedIds: [SAMPLE_ARROW.id, SAMPLE_MAGNIFY.id],
    });

    render(<MoveHandleBadge anchor={ANCHOR} scale={0.5} objects={[SAMPLE_ARROW, SAMPLE_MAGNIFY]} />);

    const badge = screen.getByRole('button', { name: 'Drag to move' });
    expect(badge.style.left).toBe('160px');
    expect(badge.style.top).toBe('168px');

    fireEvent.pointerDown(badge, { clientX: 100, clientY: 100, pointerId: 1 });
    for (let step = 1; step <= 10; step++) {
      fireEvent.pointerMove(window, {
        clientX: 100 + step * 2,
        clientY: 100 + step * 1,
        pointerId: 1,
      });
    }
    fireEvent.pointerUp(window, { clientX: 120, clientY: 110, pointerId: 1 });

    // Screen delta (+20, +10) at scale=0.5 => canvas delta (+40, +20)
    const stateObjects = useAnnotationStore.getState().objects;
    const movedArrow = stateObjects.find((o) => o.id === 'arr-1') as ArrowObject;
    const movedMagnify = stateObjects.find((o) => o.id === 'mag-1') as MagnifyObject;

    expect(movedArrow.x).toBe(50);
    expect(movedArrow.y).toBe(40);
    expect(movedMagnify.x).toBe(140);
    expect(movedMagnify.y).toBe(140);
    expect(movedMagnify.sourceX).toBe(120);
    expect(movedMagnify.sourceY).toBe(110);
    expect(recorder).toHaveBeenCalledTimes(1);
  });

  it('records 0 snapshots and leaves coordinates unchanged on a zero-delta click', () => {
    const recorder = vi.fn();
    registerHistoryRecorder(recorder);

    useAnnotationStore.setState({
      objects: [SAMPLE_ARROW],
      selectedIds: [SAMPLE_ARROW.id],
    });

    render(<MoveHandleBadge anchor={ANCHOR} scale={1} objects={[SAMPLE_ARROW]} />);

    const badge = screen.getByRole('button', { name: 'Drag to move' });
    fireEvent.pointerDown(badge, { clientX: 160, clientY: 168, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 160, clientY: 168, pointerId: 1 });

    const arrow = useAnnotationStore.getState().objects[0] as ArrowObject;
    expect(arrow.x).toBe(10);
    expect(arrow.y).toBe(20);
    expect(recorder).not.toHaveBeenCalled();
  });

  it('shows MoveHandleBadge + toolbar on single-select, union MoveHandleBadge only on multi-select, and hides both during inline text editing', () => {
    const rects: Record<string, { x: number; y: number; width: number; height: number }> = {
      'arr-1': { x: 20, y: 40, width: 80, height: 60 },
      'rect-1': { x: 180, y: 120, width: 100, height: 80 },
      'txt-1': { x: 50, y: 60, width: 90, height: 30 },
    };

    const mockStage = {
      findOne: vi.fn((predicate: (node: { id: () => string }) => boolean) => {
        for (const [id, rect] of Object.entries(rects)) {
          const fakeNode = {
            id: () => id,
            getClientRect: () => rect,
          };
          if (predicate(fakeNode)) return fakeNode;
        }
        return null;
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Konva.Stage;

    const stageRef: React.RefObject<Konva.Stage | null> = { current: mockStage };

    useAnnotationStore.setState({
      objects: [SAMPLE_ARROW, SAMPLE_RECT, SAMPLE_TEXT],
      selectedIds: ['arr-1'],
      editingTextId: null,
    });

    const { rerender } = render(<FloatingToolbarManager scale={1} stageRef={stageRef} />);

    let badge = screen.getByRole('button', { name: 'Drag to move' });
    expect(badge.style.left).toBe('60px'); // 20 + 80/2
    expect(badge.style.top).toBe('108px'); // 40 + 60 + 8
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeTruthy();

    // Multi-select: union rect is left=20, top=40, right=280, bottom=200 => center=150, top=208
    useAnnotationStore.setState({ selectedIds: ['arr-1', 'rect-1'], editingTextId: null });
    rerender(<FloatingToolbarManager scale={1} stageRef={stageRef} />);

    badge = screen.getByRole('button', { name: 'Drag to move' });
    expect(badge.style.left).toBe('150px');
    expect(badge.style.top).toBe('208px');
    expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull();

    // Inline text edit active: hides both MoveHandleBadge and floating toolbar
    useAnnotationStore.setState({ selectedIds: ['txt-1'], editingTextId: 'txt-1' });
    rerender(<FloatingToolbarManager scale={1} stageRef={stageRef} />);

    expect(screen.queryByRole('button', { name: 'Drag to move' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull();
  });
});
