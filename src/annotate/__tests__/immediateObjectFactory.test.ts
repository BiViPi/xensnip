import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createImmediateNumbered,
  createImmediateSpeechBubble,
  createImmediateText,
} from '../immediateObjectFactory';

describe('immediateObjectFactory', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates text objects at the pointer position', () => {
    expect(createImmediateText(10, 20)).toMatchObject({
      id: 'obj-1234',
      type: 'text',
      x: 10,
      y: 20,
      text: 'Type here...',
      draggable: true,
    });
  });

  it('creates numbered objects using the next display number', () => {
    expect(createImmediateNumbered(12, 24, 2)).toMatchObject({
      id: 'obj-1234',
      type: 'numbered',
      x: 12,
      y: 24,
      displayNumber: 3,
      draggable: true,
    });
  });

  it('centers speech bubbles around the pointer position', () => {
    expect(createImmediateSpeechBubble(100, 80)).toMatchObject({
      id: 'obj-1234',
      type: 'speech_bubble',
      x: 20,
      y: 44,
      tailX: 80,
      tailY: 90,
      draggable: true,
    });
  });

  it('uses provided defaults for immediate objects', () => {
    expect(
      createImmediateText(10, 20, {
        fontSize: 32,
        fontFamily: 'Fira Sans',
        fill: '#22c55e',
        fontStyle: 'italic',
        align: 'center',
        padding: 12,
      }),
    ).toMatchObject({
      fontSize: 32,
      fontFamily: 'Fira Sans',
      fill: '#22c55e',
      fontStyle: 'italic',
      align: 'center',
      padding: 12,
    });

    expect(
      createImmediateNumbered(12, 24, 1, {
        radius: 22,
        fill: '#3b82f6',
      }),
    ).toMatchObject({
      displayNumber: 2,
      radius: 22,
      fill: '#3b82f6',
    });
  });
});
