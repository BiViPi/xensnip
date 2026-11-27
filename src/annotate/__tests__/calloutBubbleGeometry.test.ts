import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { getCalloutAttachmentPoint } from '../renderers/calloutGeometry';
import {
  buildSpeechBubblePath,
  getEffectiveSpeechBubbleRadius,
} from '../renderers/speechBubbleGeometry';
import { getTextEditableContract } from '../state/textEditable';
import { TextInlineEditor } from '../TextInlineEditor';
import type { CalloutObject, SpeechBubbleObject } from '../state/types';

describe('Callout & Speech Bubble geometry + centered inline editing (T023)', () => {
  let overlay: HTMLDivElement;

  beforeEach(() => {
    overlay = document.createElement('div');
    overlay.id = 'annotation-ui-overlay';
    document.body.appendChild(overlay);
  });

  afterEach(() => {
    cleanup();
    overlay.remove();
  });

  it('intersects Callout ray with exact box perimeter across all edges', () => {
    // Directly left of center (width=100, height=50, center=(50, 25)) -> left edge x=0, y=25
    expect(getCalloutAttachmentPoint(100, 50, -50, 25)).toEqual({ x: 0, y: 25 });
    // Directly below center -> bottom edge x=50, y=50
    expect(getCalloutAttachmentPoint(100, 50, 50, 100)).toEqual({ x: 50, y: 50 });
    // Diagonal ray to (150, 75): dx=100, dy=50, tx=0.5, ty=0.5 -> corner (100, 50)
    expect(getCalloutAttachmentPoint(100, 50, 150, 75)).toEqual({ x: 100, y: 50 });
    // Inside box falls back to box center
    expect(getCalloutAttachmentPoint(100, 50, 60, 30)).toEqual({ x: 50, y: 25 });
  });

  it('clamps Speech Bubble cornerRadius and tail spread safely on small bubbles with cornerRadius=64', () => {
    const r = getEffectiveSpeechBubbleRadius(60, 40, 64);
    expect(r).toBeLessThanOrEqual(20);
    expect(r).toBeGreaterThanOrEqual(0);

    const edges: Array<[number, number]> = [
      [30, -30], // top
      [90, 20],  // right
      [30, 80],  // bottom
      [-30, 20], // left
    ];

    for (const [tx, ty] of edges) {
      const path = buildSpeechBubblePath(60, 40, 64, tx, ty);
      expect(path.startsWith('M ')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
      expect(path).not.toContain('NaN');
      expect(path).not.toContain('Infinity');

      // Validate every A rx,ry command uses non-negative radii <= min(w/2, h/2)
      const arcs = [...path.matchAll(/A ([\d.-]+),([\d.-]+) /g)];
      expect(arcs).toHaveLength(4);
      for (const m of arcs) {
        const arcR = Number(m[1]);
        expect(arcR).toBeGreaterThanOrEqual(0);
        expect(arcR).toBeLessThanOrEqual(20);
      }
    }

    // Regression parity on baseline fixture (300x150, cornerRadius=12, tail=(150, 190) -> bottom side)
    const legacyPath = buildSpeechBubblePath(300, 150, 12, 150, 190);
    expect(legacyPath).toBe(
      'M 12,0 L 288,0 A 12,12 0 0 1 300,12 L 300,138 A 12,12 0 0 1 288,150 L 162,150 L 150,190 L 138,150 L 12,150 A 12,12 0 0 1 0,138 L 0,12 A 12,12 0 0 1 12,0 Z'
    );
  });

  it('centers inline TextInlineEditor and clears default Callout / Speech Bubble placeholder text', () => {
    const bubble: SpeechBubbleObject = {
      id: 'bub-1',
      type: 'speech_bubble',
      x: 20,
      y: 30,
      rotation: 0,
      width: 160,
      height: 72,
      text: 'Type here...',
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: '#ffffff',
      textColor: '#1e293b',
      stroke: '#1e293b',
      padding: 10,
      cornerRadius: 10,
      tailX: 80,
      tailY: 90,
      draggable: true,
    };
    const callout: CalloutObject = {
      id: 'cal-1',
      type: 'callout',
      x: 100,
      y: 80,
      rotation: 0,
      width: 120,
      height: 48,
      text: 'Callout',
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: '#ffffff',
      textColor: '#1e293b',
      stroke: '#1e293b',
      padding: 8,
      cornerRadius: 4,
      targetX: 40,
      targetY: 50,
      lineColor: '#1e293b',
      lineWidth: 2,
      draggable: true,
    };

    const bubbleContract = getTextEditableContract(bubble)!;
    expect(bubbleContract.textAlign).toBe('center');

    const { rerender } = render(
      React.createElement(TextInlineEditor, {
        editingTextId: 'bub-1',
        objects: [bubble, callout],
        overlay,
        scale: 1,
        onClose: () => {},
        onCancel: () => {},
      })
    );

    const textarea1 = overlay.querySelector('textarea')!;
    expect(textarea1.style.textAlign).toBe('center');
    expect(textarea1.value).toBe('');

    rerender(
      React.createElement(TextInlineEditor, {
        editingTextId: 'cal-1',
        objects: [bubble, callout],
        overlay,
        scale: 1,
        onClose: () => {},
        onCancel: () => {},
      })
    );

    const textarea2 = overlay.querySelector('textarea')!;
    expect(textarea2.style.textAlign).toBe('center');
    expect(textarea2.value).toBe('');
  });
});
