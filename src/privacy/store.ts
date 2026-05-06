import { create } from 'zustand';

export interface SmartRedactCandidate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence?: number;
  status: 'pending' | 'accepted' | 'rejected';
}

interface PrivacyStore {
  status: 'idle' | 'detecting' | 'ready' | 'error';
  scope: 'full_canvas' | 'selection';
  selectionRect: { x: number; y: number; width: number; height: number } | null;
  candidates: SmartRedactCandidate[];
  error: string | null;

  setStatus: (status: PrivacyStore['status']) => void;
  setScope: (scope: PrivacyStore['scope']) => void;
  setSelectionRect: (rect: PrivacyStore['selectionRect']) => void;
  setCandidates: (candidates: SmartRedactCandidate[]) => void;
  updateCandidateStatus: (id: string, status: SmartRedactCandidate['status']) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePrivacyStore = create<PrivacyStore>((set) => ({
  status: 'idle',
  scope: 'full_canvas',
  selectionRect: null,
  candidates: [],
  error: null,

  setStatus: (status) => set({ status }),
  setScope: (scope) => set({ scope }),
  setSelectionRect: (selectionRect) => set({ selectionRect }),
  setCandidates: (candidates) => set({ candidates }),
  updateCandidateStatus: (id, status) => set((state) => ({
    candidates: state.candidates.map((c) => (c.id === id ? { ...c, status } : c)),
  })),
  setError: (error) => set({ error }),
  reset: () => set({
    status: 'idle',
    scope: 'full_canvas',
    candidates: [],
    selectionRect: null,
    error: null,
  }),
}));
