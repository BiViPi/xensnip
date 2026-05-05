import { FeatureId } from './store';
import { 
  AnnotateIcon, 
  PrivacyIcon, 
  CropCanvasIcon, 
  StepsCalloutIcon, 
  FocusPolishIcon, 
  MeasureExtractIcon 
} from '../components/icons';

export interface SidebarFeature {
  id: FeatureId;
  label: string;
  icon: any;
  enabled: boolean;
  locked?: boolean;
}

export const FEATURES: SidebarFeature[] = [
  { id: 'annotate', label: 'Annotate', icon: AnnotateIcon, enabled: true },
  { id: 'privacy', label: 'Privacy', icon: PrivacyIcon, enabled: true },
  { id: 'crop_canvas', label: 'Crop & Canvas', icon: CropCanvasIcon, enabled: true },
  { id: 'steps_callouts', label: 'Steps & Callouts', icon: StepsCalloutIcon, enabled: true },
  { id: 'focus_polish', label: 'Focus & Polish', icon: FocusPolishIcon, enabled: true },
  { id: 'measure_extract', label: 'Measure & Extract', icon: MeasureExtractIcon, enabled: true },
];
