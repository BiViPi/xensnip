import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { useAnnotationPointerHandlers } from '../useAnnotationPointerHandlers';
import { useAnnotationStore } from '../state/store';
import type { MagnifyObject, SimplifyUiObject } from '../state/types';

function makePointerStageEnv() {
  let pointerPos = { x: 100, y: 100 };
  const layerNode = {
    className: 'Layer',
    getParent: () => stageNode,
    getStage: () => stageNode,
  };
  const stageNode = {
    className: 'Stage',
    getStage: () => stageNode,
    getParent: () => null,
    getPointerPosition: () => pointerPos,
    findOne: () => null,
  };

  return {
    stageNode: stageNode as unknown as Konva.Stage,
    layerNode: layerNode as unknown as Konva.Node,
    setPointerPos: (x: number, y: number) => {
      pointerPos = { x, y };
    },
  };
}

const SAMPLE_MAGNIFY: MagnifyObject = {
  id: 'mag-1',
  type: 'magnify',
  x: 60,
  y: 60,
  rotation: 0,
  width: 180,
  height: 120,
  sourceX: 90,
  sourceY: 80,
  sourceWidth: 120,
  sourceHeight: 80,
  zoom: 1.5,
  cornerRadius: 20,
  borderOpacity: 0.8,
  draggable: true,
};

const SAMPLE_SIMPLIFY: SimplifyUiObject = {
  id: 'sui-1',
  type: 'simplify_ui',
  x: 40,
  y: 40,
  rotation: 0,
  width: 180,
  height: 90,
  dimOpacity: 0.52,
  blockOpacity: 0.52,
  blurRadius: 4,
  detailLevel: 50,
  saturation: 0.35,
  cornerRadius: 16,
  draggable: true,
};

describe('useAnnotationPointerHandlers — post-create drag guard', () => {
  beforeEach(() => {
    useAnnotationStore.setState({
      activeTool: 'select',
      objects: [],
      selectedIds: [],
      editingTextId: null,
      toolbarCollapsed: false,
    });
  });

  function renderPointerHook(stageNode: Konva.Stage) {
    const ocrRequestIdRef = { current: 0 };
    const stageRef = { current: stageNode };
    const compositionCanvasRef = { current: null };

    return renderHook(() =>
      useAnnotationPointerHandlers({
        scale: 1,
        stageWidth: 800,
        stageHeight: 600,
        stageRef,
        compositionCanvasRef,
        setCurrentSample: vi.fn(),
        colorPickerFrozen: false,
        setColorPickerFrozen: vi.fn(),
        setOcrRegion: vi.fn(),
        setOcrStatus: vi.fn(),
        setOcrProgress: vi.fn(),
        setOcrText: vi.fn(),
        setOcrError: vi.fn(),
        ocrRequestIdRef,
        setPrivacyStatus: vi.fn(),
        setSelectionRect: vi.fn(),
        setScope: vi.fn(),
        resetPrivacy: vi.fn(),
        activeUtility: null,
      })
    );
  }

  it('does not spawn a tiny second object when dragging an existing draggable annotation while a repeatable tool stays active', () => {
    const env = makePointerStageEnv();
    useAnnotationStore.setState({
      activeTool: 'magnify',
      objects: [SAMPLE_MAGNIFY],
      selectedIds: ['mag-1'],
    });

    const childRectInsideGroup = {
      className: 'Rect',
      draggable: () => false,
      id: () => '',
      getParent: () => groupNode,
      getStage: () => env.stageNode,
    };
    const groupNode = {
      className: 'Group',
      draggable: () => true,
      id: () => 'mag-1',
      getParent: () => env.layerNode,
      getStage: () => env.stageNode,
    };

    const { result } = renderPointerHook(env.stageNode);

    act(() => {
      env.setPointerPos(120, 120);
      result.current.handleMouseDown({
        target: childRectInsideGroup,
        evt: { ctrlKey: false, metaKey: false },
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
    });

    expect(result.current.drawingObject).toBeNull();

    act(() => {
      env.setPointerPos(145, 138);
      result.current.handleMouseMove({
        target: childRectInsideGroup,
        evt: {},
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
      result.current.handleMouseUp({
        target: childRectInsideGroup,
        evt: { ctrlKey: false, metaKey: false },
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
    });

    const state = useAnnotationStore.getState();
    expect(state.objects).toHaveLength(1);
    expect(state.selectedIds).toEqual(['mag-1']);
    expect(result.current.drawingObject).toBeNull();
  });

  it('does not spawn an object when dragging Transformer handles or clicking an unselected draggable node', () => {
    const env = makePointerStageEnv();
    useAnnotationStore.setState({
      activeTool: 'simplify_ui',
      objects: [SAMPLE_SIMPLIFY],
      selectedIds: [],
    });

    const simplifyNode = {
      className: 'Image',
      draggable: () => true,
      id: () => 'sui-1',
      getParent: () => env.layerNode,
      getStage: () => env.stageNode,
    };

    const transformerAnchor = {
      className: 'Rect',
      draggable: () => false,
      id: () => '',
      getParent: () => ({
        className: 'Transformer',
        getParent: () => env.layerNode,
        getStage: () => env.stageNode,
      }),
      getStage: () => env.stageNode,
    };

    const { result } = renderPointerHook(env.stageNode);

    act(() => {
      env.setPointerPos(80, 60);
      result.current.handleMouseDown({
        target: simplifyNode,
        evt: { ctrlKey: false, metaKey: false },
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
      env.setPointerPos(110, 80);
      result.current.handleMouseUp({
        target: simplifyNode,
        evt: { ctrlKey: false, metaKey: false },
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
    });

    expect(useAnnotationStore.getState().objects).toHaveLength(1);
    expect(useAnnotationStore.getState().selectedIds).toEqual(['sui-1']);

    act(() => {
      useAnnotationStore.setState({ activeTool: 'arrow' });
      env.setPointerPos(220, 130);
      result.current.handleMouseDown({
        target: transformerAnchor,
        evt: { ctrlKey: false, metaKey: false },
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
      env.setPointerPos(245, 145);
      result.current.handleMouseUp({
        target: transformerAnchor,
        evt: { ctrlKey: false, metaKey: false },
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
    });

    expect(useAnnotationStore.getState().objects).toHaveLength(1);
  });

  it('still allows drawing a second annotation when dragging on empty Stage background', () => {
    const env = makePointerStageEnv();
    useAnnotationStore.setState({
      activeTool: 'magnify',
      objects: [SAMPLE_MAGNIFY],
      selectedIds: ['mag-1'],
    });

    const { result } = renderPointerHook(env.stageNode);

    act(() => {
      env.setPointerPos(300, 200);
      result.current.handleMouseDown({
        target: env.stageNode,
        evt: { ctrlKey: false, metaKey: false },
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
    });
    expect(result.current.drawingObject).not.toBeNull();

    act(() => {
      env.setPointerPos(380, 260);
      result.current.handleMouseMove({
        target: env.stageNode,
        evt: {},
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
    });

    act(() => {
      result.current.handleMouseUp({
        target: env.stageNode,
        evt: { ctrlKey: false, metaKey: false },
      } as unknown as Konva.KonvaEventObject<MouseEvent>);
    });

    const state = useAnnotationStore.getState();
    expect(state.objects).toHaveLength(2);
    expect(state.objects[1].type).toBe('magnify');
    expect(state.selectedIds).toEqual([state.objects[1].id]);
  });
});
