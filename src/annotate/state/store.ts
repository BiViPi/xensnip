import { create } from 'zustand';
import { AnnotateObject, ToolId } from './types';
import { recordHistorySnapshot } from '../../editor/historyBridge';

export interface AnnotationSnapshot {
  activeTool: ToolId;
  objects: AnnotateObject[];
  selectedId: string | null;
  editingTextId: string | null;
  toolbarCollapsed: boolean;
}

interface AnnotationState {
  activeTool: ToolId;
  objects: AnnotateObject[];
  selectedId: string | null;
  editingTextId: string | null;
  toolbarCollapsed: boolean;
  
  setActiveTool: (tool: ToolId) => void;
  addObject: (obj: AnnotateObject) => void;
  updateObject: (id: string, patch: Partial<AnnotateObject>) => void;
  removeObject: (id: string) => void;
  select: (id: string | null) => void;
  setEditingTextId: (id: string | null) => void;
  setToolbarCollapsed: (collapsed: boolean) => void;
  clearAll: () => void;
  restoreSnapshot: (snapshot: AnnotationSnapshot) => void;
}

const cloneObjects = (objects: AnnotateObject[]) => objects.map((obj) => ({ ...obj })) as AnnotateObject[];

export const useAnnotationStore = create<AnnotationState>((set) => ({
  activeTool: 'select',
  objects: [],
  selectedId: null,
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
  removeObject: (id) => set((state) => {
    recordHistorySnapshot();
    return {
      objects: state.objects.filter((o) => o.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      editingTextId: state.editingTextId === id ? null : state.editingTextId,
    };
  }),
  select: (id) => set({ selectedId: id }),
  setEditingTextId: (id) => set({ editingTextId: id }),
  setToolbarCollapsed: (collapsed) => set({ toolbarCollapsed: collapsed }),
  clearAll: () => set((state) => {
    recordHistorySnapshot();
    return {
      objects: [],
      selectedId: null,
      editingTextId: null,
      activeTool: state.activeTool,
    };
  }),
  restoreSnapshot: (snapshot) => set({
    activeTool: snapshot.activeTool,
    objects: cloneObjects(snapshot.objects),
    selectedId: snapshot.selectedId,
    editingTextId: snapshot.editingTextId,
    toolbarCollapsed: snapshot.toolbarCollapsed,
  }),
}));

// Derived selector
export const useHasAnnotations = () => useAnnotationStore((s) => s.objects.length > 0);
