import { create } from 'zustand';
import { AnnotateObject, ToolId } from './types';

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
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  activeTool: 'select',
  objects: [],
  selectedId: null,
  editingTextId: null,
  toolbarCollapsed: false,

  setActiveTool: (tool) => set({ activeTool: tool }),
  addObject: (obj) => set((state) => ({ 
    objects: [...state.objects, obj] 
  })),
  updateObject: (id, patch) => set((state) => ({
    objects: state.objects.map((o) => (o.id === id ? { ...o, ...patch } as AnnotateObject : o)),
  })),
  removeObject: (id) => set((state) => ({
    objects: state.objects.filter((o) => o.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId,
    editingTextId: state.editingTextId === id ? null : state.editingTextId,
  })),
  select: (id) => set({ selectedId: id }),
  setEditingTextId: (id) => set({ editingTextId: id }),
  setToolbarCollapsed: (collapsed) => set({ toolbarCollapsed: collapsed }),
  clearAll: () => set({ objects: [], selectedId: null, editingTextId: null }),
}));

// Derived selector
export const useHasAnnotations = () => useAnnotationStore((s) => s.objects.length > 0);
