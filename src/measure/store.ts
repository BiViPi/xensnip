import { create } from 'zustand';

export type MeasureUtilityToolId = 'grid_overlay' | 'color_picker' | 'ocr_extract' | 'smart_redact_ai';

interface MeasureStore {
  activeUtility: MeasureUtilityToolId | null;
  gridVisible: boolean;
  gridSpacing: number;
  gridOpacity: number;
  currentSample: {
    x: number;
    y: number;
    hex: string;
    rgb: [number, number, number];
  } | null;
  colorPickerFrozen: boolean;
  ocrRegion: { x: number; y: number; width: number; height: number } | null;
  ocrText: string;
  ocrStatus: 'idle' | 'selecting' | 'running' | 'ready' | 'error';
  ocrError: string | null;

  setActiveUtility: (utility: MeasureUtilityToolId | null) => void;
  setGridVisible: (visible: boolean) => void;
  setGridSpacing: (spacing: number) => void;
  setGridOpacity: (opacity: number) => void;
  setCurrentSample: (sample: MeasureStore['currentSample']) => void;
  setColorPickerFrozen: (frozen: boolean) => void;
  setOcrRegion: (region: MeasureStore['ocrRegion']) => void;
  setOcrText: (text: string) => void;
  setOcrStatus: (status: MeasureStore['ocrStatus']) => void;
  setOcrError: (error: string | null) => void;
}

export const useMeasureStore = create<MeasureStore>((set) => ({
  activeUtility: null,
  gridVisible: false,
  gridSpacing: 50,
  gridOpacity: 0.2,
  currentSample: null,
  colorPickerFrozen: false,
  ocrRegion: null,
  ocrText: '',
  ocrStatus: 'idle',
  ocrError: null,

  setActiveUtility: (activeUtility) => set({ activeUtility, colorPickerFrozen: false }),
  setGridVisible: (gridVisible) => set({ gridVisible }),
  setGridSpacing: (gridSpacing) => set({ gridSpacing }),
  setGridOpacity: (gridOpacity) => set({ gridOpacity }),
  setCurrentSample: (currentSample) => set({ currentSample }),
  setColorPickerFrozen: (colorPickerFrozen) => set({ colorPickerFrozen }),
  setOcrRegion: (ocrRegion) => set({ ocrRegion }),
  setOcrText: (ocrText) => set({ ocrText }),
  setOcrStatus: (ocrStatus) => set({ ocrStatus }),
  setOcrError: (ocrError) => set({ ocrError }),
}));
