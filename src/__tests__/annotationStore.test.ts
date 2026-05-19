import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnotationStore } from '../annotate/state/store';
import { DEFAULT_ANNOTATION_DEFAULTS } from '../annotate/state/defaults';
import type { ArrowObject } from '../annotate/state/types';

function makeArrow(id: string): ArrowObject {
  return {
    id,
    type: 'arrow',
    x: 0,
    y: 0,
    rotation: 0,
    draggable: true,
    points: [0, 0, 100, 100],
    stroke: '#ff0000',
    strokeWidth: 2,
    pointerLength: 10,
    pointerWidth: 10,
    style: 'solid',
  };
}

beforeEach(() => {
  useAnnotationStore.setState({
    objects: [],
    selectedIds: [],
    activeTool: 'select',
    annotationDefaults: structuredClone(DEFAULT_ANNOTATION_DEFAULTS),
  });
});

describe('annotationStore', () => {
  it('addObject appends without mutating existing array', () => {
    const before = useAnnotationStore.getState().objects;
    useAnnotationStore.getState().addObject(makeArrow('a1'));
    const after = useAnnotationStore.getState().objects;
    expect(after).not.toBe(before);
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe('a1');
  });

  it('removeObject removes by id', () => {
    useAnnotationStore.getState().addObject(makeArrow('a1'));
    useAnnotationStore.getState().addObject(makeArrow('a2'));
    useAnnotationStore.getState().removeObject('a1');
    const objects = useAnnotationStore.getState().objects;
    expect(objects).toHaveLength(1);
    expect(objects[0].id).toBe('a2');
  });

  it('removeObject removes id from selectedIds when it matched the removed id', () => {
    useAnnotationStore.getState().addObject(makeArrow('a1'));
    useAnnotationStore.setState({ selectedIds: ['a1'] });
    useAnnotationStore.getState().removeObject('a1');
    expect(useAnnotationStore.getState().selectedIds).toHaveLength(0);
  });

  it('clearAll resets objects and selectedIds but preserves activeTool', () => {
    useAnnotationStore.getState().addObject(makeArrow('a1'));
    useAnnotationStore.setState({ selectedIds: ['a1'], activeTool: 'rectangle' });
    useAnnotationStore.getState().clearAll();
    const state = useAnnotationStore.getState();
    expect(state.objects).toHaveLength(0);
    expect(state.selectedIds).toHaveLength(0);
    expect(state.activeTool).toBe('rectangle');
  });

  it('nudgeObject updates x and y relative to current position', () => {
    useAnnotationStore.getState().addObject({ ...makeArrow('a1'), x: 10, y: 20 });
    useAnnotationStore.getState().nudgeObject('a1', 5, -2);
    
    const obj = useAnnotationStore.getState().objects[0];
    expect(obj.x).toBe(15);
    expect(obj.y).toBe(18);
  });

  it('nudgeObject is a no-op when id is not found', () => {
    useAnnotationStore.getState().addObject(makeArrow('a1'));
    useAnnotationStore.getState().nudgeObject('nonexistent', 1, 1);
    
    const obj = useAnnotationStore.getState().objects[0];
    expect(obj.x).toBe(0);
    expect(obj.y).toBe(0);
  });

  it('getToolDefaults returns a detached snapshot', () => {
    const snapshot = useAnnotationStore.getState().getToolDefaults();
    snapshot.arrow!.stroke = '#123456';

    expect(useAnnotationStore.getState().annotationDefaults.arrow?.stroke).toBe('#ef4444');
  });

  it('setToolDefaults updates defaults without mutating placed objects', () => {
    useAnnotationStore.getState().addObject(makeArrow('a1'));
    const beforeObject = useAnnotationStore.getState().objects[0];

    useAnnotationStore.getState().setToolDefaults({
      schema_version: 1,
      arrow: {
        stroke: '#22c55e',
        strokeWidth: 8,
        pointerLength: 24,
        pointerWidth: 18,
        style: 'dashed',
      },
    });

    const state = useAnnotationStore.getState();
    expect(state.annotationDefaults.arrow).toMatchObject({
      stroke: '#22c55e',
      strokeWidth: 8,
      pointerLength: 24,
      pointerWidth: 18,
      style: 'dashed',
    });
    expect(state.objects[0]).toEqual(beforeObject);
  });

  it('patchToolDefaults only updates allowlisted fields on the targeted tool', () => {
    useAnnotationStore.getState().patchToolDefaults('arrow', {
      stroke: '#3b82f6',
      strokeWidth: 7,
      targetX: 999,
    } as never);

    const defaults = useAnnotationStore.getState().annotationDefaults;
    expect(defaults.arrow).toMatchObject({
      stroke: '#3b82f6',
      strokeWidth: 7,
    });
    expect((defaults.arrow as unknown as Record<string, unknown>).targetX).toBeUndefined();
    expect(defaults.rectangle).toEqual(DEFAULT_ANNOTATION_DEFAULTS.rectangle);
  });
});
