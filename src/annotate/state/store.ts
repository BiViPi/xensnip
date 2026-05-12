import { create } from 'zustand';
import { AnnotateObject, ToolId } from './types';
import { recordHistorySnapshot } from '../../editor/historyBridge';

export interface AnnotationSnapshot {
  activeTool: ToolId;
  objects: AnnotateObject[];
  selectedIds: string[];
  editingTextId: string | null;
  toolbarCollapsed: boolean;
}

interface AnnotationState {
  activeTool: ToolId;
  objects: AnnotateObject[];
  selectedIds: string[];
  editingTextId: string | null;
  toolbarCollapsed: boolean;
  
  setActiveTool: (tool: ToolId) => void;
  addObject: (obj: AnnotateObject) => void;
  updateObject: (id: string, patch: Partial<AnnotateObject>) => void;
  removeObject: (id: string) => void;
  removeObjects: (ids: string[]) => void;
  select: (id: string | null) => void;
  selectMultiple: (ids: string[]) => void;
  selectAdditive: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  setEditingTextId: (id: string | null) => void;
  setToolbarCollapsed: (collapsed: boolean) => void;
  clearAll: () => void;
  restoreSnapshot: (snapshot: AnnotationSnapshot) => void;
  nudgeObject: (id: string, dx: number, dy: number) => void;
}

const cloneObjects = (objects: AnnotateObject[]) => objects.map((obj) => ({ ...obj })) as AnnotateObject[];

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  activeTool: 'select',
  objects: [],
  selectedIds: [],
  editingTextId: null,
  toolbarCollapsed: false,

  setActiveTool: (tool) => set({ activeTool: tool }),
  addObject: (obj) => set((state) => {
    recordHistorySnapshot();
    return { objects: [...state.objects, obj] };
  }),
  updateObject: (id, patch) => set((state) => {
    recordHistorySnapshot();
    return {
      objects: state.objects.map((o) => (o.id === id ? { ...o, ...patch } as AnnotateObject : o)),
    };
  }),
  nudgeObject: (id, dx, dy) => {
    const target = get().objects.find((o) => o.id === id);
    if (!target) return;
    get().updateObject(id, { x: target.x + dx, y: target.y + dy });
  },
  removeObject: (id) => set((state) => {
    recordHistorySnapshot();
    return {
      objects: state.objects.filter((o) => o.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
      editingTextId: state.editingTextId === id ? null : state.editingTextId,
    };
  }),
  removeObjects: (ids) => set((state) => {
    if (ids.length === 0) return state;
    recordHistorySnapshot();
    const idSet = new Set(ids);
    return {
      objects: state.objects.filter((o) => !idSet.has(o.id)),
      selectedIds: state.selectedIds.filter((sid) => !idSet.has(sid)),
      editingTextId: state.editingTextId && idSet.has(state.editingTextId) ? null : state.editingTextId,
    };
  }),
  select: (id) => set({ selectedIds: id ? [id] : [] }),
  selectMultiple: (ids) => set({ selectedIds: ids }),
  selectAdditive: (ids) => set((state) => ({
    selectedIds: Array.from(new Set([...state.selectedIds, ...ids]))
  })),
  toggleSelect: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter(sid => sid !== id)
      : [...state.selectedIds, id]
  })),
  setEditingTextId: (id) => set({ editingTextId: id }),
  setToolbarCollapsed: (collapsed) => set({ toolbarCollapsed: collapsed }),
  clearAll: () => set((state) => {
    recordHistorySnapshot();
    return {
      objects: [],
      selectedIds: [],
      editingTextId: null,
      activeTool: state.activeTool,
    };
  }),
  restoreSnapshot: (snapshot) => set({
    activeTool: snapshot.activeTool,
    objects: cloneObjects(snapshot.objects),
    selectedIds: (snapshot as any).selectedId ? [(snapshot as any).selectedId] : (snapshot.selectedIds || []), // backward compat for old snapshots
    editingTextId: snapshot.editingTextId,
    toolbarCollapsed: snapshot.toolbarCollapsed,
  }),
}));

// Derived selector
export const useHasAnnotations = () => useAnnotationStore((s) => s.objects.length > 0);
