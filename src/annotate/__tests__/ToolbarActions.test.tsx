import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDuplicatedObject } from '../floating/ToolbarActions';
import { ArrowToolbar } from '../floating/ArrowToolbar';
import { RectangleToolbar } from '../floating/RectangleToolbar';
import { TextToolbar } from '../floating/TextToolbar';
import { BlurToolbar } from '../floating/BlurToolbar';
import { SpotlightToolbar } from '../floating/SpotlightToolbar';
import { SimplifyUiToolbar } from '../floating/SimplifyUiToolbar';
import { MagnifyToolbar } from '../floating/MagnifyToolbar';
import { NumberedToolbar } from '../floating/NumberedToolbar';
import { SpeechBubbleToolbar } from '../floating/SpeechBubbleToolbar';
import { CalloutToolbar } from '../floating/CalloutToolbar';
import { FreehandArrowToolbar } from '../floating/FreehandArrowToolbar';
import { PixelRulerToolbar } from '../floating/PixelRulerToolbar';
import { useAnnotationStore } from '../state/store';
import type {
  AnnotateObject,
  ArrowObject,
  BlurObject,
  CalloutObject,
  FreehandArrowObject,
  MagnifyObject,
  NumberedObject,
  PixelRulerObject,
  RectangleObject,
  SimplifyUiObject,
  SpeechBubbleObject,
  SpotlightObject,
  TextObject,
} from '../state/types';

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
  x: 10,
  y: 20,
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
  x: 10,
  y: 20,
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

const SAMPLE_BLUR: BlurObject = {
  id: 'blur-1',
  type: 'blur',
  x: 10,
  y: 20,
  rotation: 0,
  width: 100,
  height: 50,
  blurRadius: 10,
  draggable: true,
};

const SAMPLE_SPOTLIGHT: SpotlightObject = {
  id: 'spot-1',
  type: 'spotlight',
  x: 10,
  y: 20,
  rotation: 0,
  width: 120,
  height: 80,
  opacity: 0.58,
  cornerRadius: 24,
  draggable: true,
};

const SAMPLE_SIMPLIFY: SimplifyUiObject = {
  id: 'sui-1',
  type: 'simplify_ui',
  x: 10,
  y: 20,
  rotation: 0,
  width: 120,
  height: 80,
  dimOpacity: 0.52,
  blurRadius: 4,
  saturation: 0.35,
  cornerRadius: 16,
  draggable: true,
};

const SAMPLE_MAGNIFY: MagnifyObject = {
  id: 'mag-1',
  type: 'magnify',
  x: 10,
  y: 20,
  rotation: 0,
  width: 180,
  height: 90,
  sourceX: 50,
  sourceY: 60,
  sourceWidth: 100,
  sourceHeight: 50,
  zoom: 1.8,
  cornerRadius: 20,
  borderOpacity: 0.8,
  draggable: true,
};

const SAMPLE_NUMBERED: NumberedObject = {
  id: 'num-1',
  type: 'numbered',
  x: 30,
  y: 40,
  rotation: 0,
  displayNumber: 1,
  radius: 14,
  fill: '#ef4444',
  draggable: true,
};

const SAMPLE_BUBBLE: SpeechBubbleObject = {
  id: 'bub-1',
  type: 'speech_bubble',
  x: 20,
  y: 30,
  rotation: 0,
  width: 160,
  height: 72,
  text: 'Note',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  fill: '#ffffff',
  textColor: '#1e1e2e',
  stroke: '#1e1e2e',
  padding: 10,
  cornerRadius: 10,
  tailX: 80,
  tailY: 90,
  draggable: true,
};

const SAMPLE_CALLOUT: CalloutObject = {
  id: 'cal-1',
  type: 'callout',
  x: 100,
  y: 80,
  rotation: 0,
  width: 120,
  height: 48,
  text: 'Label',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  fill: '#ffffff',
  textColor: '#1e1e2e',
  stroke: '#1e1e2e',
  padding: 8,
  cornerRadius: 4,
  targetX: 40,
  targetY: 50,
  lineColor: '#1e1e2e',
  lineWidth: 2,
  draggable: true,
};

const SAMPLE_FREEHAND: FreehandArrowObject = {
  id: 'fh-1',
  type: 'freehand_arrow',
  x: 10,
  y: 20,
  rotation: 0,
  points: [0, 0, 20, 15, 50, 30],
  stroke: '#ef4444',
  strokeWidth: 4,
  smoothing: 0.5,
  pointerLength: 12,
  pointerWidth: 12,
  draggable: true,
};

const SAMPLE_RULER: PixelRulerObject = {
  id: 'rul-1',
  type: 'pixel_ruler',
  x: 10,
  y: 20,
  rotation: 0,
  points: [0, 0, 120, 0],
  stroke: '#ef4444',
  strokeWidth: 2,
  labelFill: '#ffffff',
  showBackground: true,
  draggable: true,
};

describe('ToolbarActions & floating toolbars Duplicate/Delete integration (T003, T006, T008-T011)', () => {
  let overlay: HTMLDivElement;

  beforeEach(() => {
    overlay = document.createElement('div');
    overlay.id = 'annotation-ui-overlay';
    document.body.appendChild(overlay);
    useAnnotationStore.setState({
      objects: [],
      selectedIds: [],
      editingTextId: null,
      toolbarCollapsed: false,
    });
  });

  afterEach(() => {
    cleanup();
    overlay.remove();
    vi.restoreAllMocks();
  });

  it('clones points, callout target, magnify source, and numbered max+1 accurately', () => {
    const dupArrow = createDuplicatedObject(SAMPLE_ARROW, [SAMPLE_ARROW], 'dup-arr') as ArrowObject;
    expect(dupArrow.x).toBe(20);
    expect(dupArrow.y).toBe(30);
    expect(dupArrow.points).toEqual([0, 0, 80, 40]);
    expect(dupArrow.points).not.toBe(SAMPLE_ARROW.points);

    const dupCallout = createDuplicatedObject(SAMPLE_CALLOUT, [SAMPLE_CALLOUT], 'dup-cal') as CalloutObject;
    expect(dupCallout.targetX).toBe(50);
    expect(dupCallout.targetY).toBe(60);

    const dupMagnify = createDuplicatedObject(SAMPLE_MAGNIFY, [SAMPLE_MAGNIFY], 'dup-mag') as MagnifyObject;
    expect(dupMagnify.sourceX).toBe(60);
    expect(dupMagnify.sourceY).toBe(70);

    const num3: NumberedObject = { ...SAMPLE_NUMBERED, id: 'num-3', displayNumber: 3 };
    const dupNum = createDuplicatedObject(SAMPLE_NUMBERED, [SAMPLE_NUMBERED, num3], 'dup-num') as NumberedObject;
    expect(dupNum.displayNumber).toBe(4);
  });

  const toolbarCases: Array<{
    name: string;
    obj: AnnotateObject;
    renderToolbar: () => React.ReactElement;
  }> = [
    { name: 'ArrowToolbar', obj: SAMPLE_ARROW, renderToolbar: () => React.createElement(ArrowToolbar, { anchor: ANCHOR, obj: SAMPLE_ARROW }) },
    { name: 'RectangleToolbar', obj: SAMPLE_RECT, renderToolbar: () => React.createElement(RectangleToolbar, { anchor: ANCHOR, obj: SAMPLE_RECT }) },
    { name: 'TextToolbar', obj: SAMPLE_TEXT, renderToolbar: () => React.createElement(TextToolbar, { anchor: ANCHOR, obj: SAMPLE_TEXT }) },
    { name: 'BlurToolbar', obj: SAMPLE_BLUR, renderToolbar: () => React.createElement(BlurToolbar, { anchor: ANCHOR, obj: SAMPLE_BLUR }) },
    { name: 'SpotlightToolbar', obj: SAMPLE_SPOTLIGHT, renderToolbar: () => React.createElement(SpotlightToolbar, { anchor: ANCHOR, obj: SAMPLE_SPOTLIGHT }) },
    { name: 'SimplifyUiToolbar', obj: SAMPLE_SIMPLIFY, renderToolbar: () => React.createElement(SimplifyUiToolbar, { anchor: ANCHOR, obj: SAMPLE_SIMPLIFY }) },
    { name: 'MagnifyToolbar', obj: SAMPLE_MAGNIFY, renderToolbar: () => React.createElement(MagnifyToolbar, { anchor: ANCHOR, obj: SAMPLE_MAGNIFY }) },
    { name: 'NumberedToolbar', obj: SAMPLE_NUMBERED, renderToolbar: () => React.createElement(NumberedToolbar, { anchor: ANCHOR, obj: SAMPLE_NUMBERED }) },
    { name: 'SpeechBubbleToolbar', obj: SAMPLE_BUBBLE, renderToolbar: () => React.createElement(SpeechBubbleToolbar, { anchor: ANCHOR, obj: SAMPLE_BUBBLE }) },
    { name: 'CalloutToolbar', obj: SAMPLE_CALLOUT, renderToolbar: () => React.createElement(CalloutToolbar, { anchor: ANCHOR, obj: SAMPLE_CALLOUT }) },
    { name: 'FreehandArrowToolbar', obj: SAMPLE_FREEHAND, renderToolbar: () => React.createElement(FreehandArrowToolbar, { anchor: ANCHOR, obj: SAMPLE_FREEHAND }) },
    { name: 'PixelRulerToolbar', obj: SAMPLE_RULER, renderToolbar: () => React.createElement(PixelRulerToolbar, { anchor: ANCHOR, obj: SAMPLE_RULER }) },
  ];

  toolbarCases.forEach(({ name, obj, renderToolbar }) => {
    it(`${name} exposes functional Duplicate and Delete buttons`, () => {
      useAnnotationStore.setState({ objects: [obj], selectedIds: [obj.id] });
      render(renderToolbar());

      fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
      expect(useAnnotationStore.getState().objects).toHaveLength(2);
      const duplicatedId = useAnnotationStore.getState().selectedIds[0];
      expect(duplicatedId).not.toBe(obj.id);

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(useAnnotationStore.getState().objects.some((o) => o.id === obj.id)).toBe(false);
    });
  });
});
