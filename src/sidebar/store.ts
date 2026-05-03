import { create } from 'zustand';

export type FeatureId = 'annotate' | 'privacy' | 'crop_canvas' | 'steps_callouts' | 'focus_polish' | 'measure_extract';

interface SidebarState {
  collapsed: boolean;
  activeFeatureId: FeatureId | null;
  toggle: () => void;
  openFeature: (id: FeatureId) => void;
  closeFeature: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: true,
  activeFeatureId: null,
  toggle: () => set((state) => ({ collapsed: !state.collapsed })),
  openFeature: (id) => set({ activeFeatureId: id, collapsed: false }),
  closeFeature: () => set({ activeFeatureId: null }),
  setCollapsed: (collapsed) => set({ collapsed }),
}));
