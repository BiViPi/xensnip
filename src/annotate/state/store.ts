import { create } from 'zustand';
import { AnnotateObject, ToolId } from './types';

interface AnnotationState {
  activeTool: ToolId;
  objects: AnnotateObject[];
  selectedId: string | null;
  
  setActiveTool: (tool: ToolId) => void;
  addObject: (obj: AnnotateObject) => void;
  updateObject: (id: string, patch: Partial<AnnotateObject>) => void;
  removeObject: (id: string) => void;
  select: (id: string | null) => void;
  clearAll: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  activeTool: 'select',
  objects: [],
  selectedId: null,

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
  })),
  select: (id) => set({ selectedId: id }),
  clearAll: () => set({ objects: [], selectedId: null }),
}));

// Derived selector
export const useHasAnnotations = () => useAnnotationStore((s) => s.objects.length > 0);
