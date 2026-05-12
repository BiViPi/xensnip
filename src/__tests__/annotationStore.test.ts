import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnotationStore } from '../annotate/state/store';
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
  useAnnotationStore.setState({ objects: [], selectedIds: [], activeTool: 'select' });
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
});
