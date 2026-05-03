import { FeatureId } from './store';
import { 
  Pencil, 
  ShieldAlert, 
  Crop, 
  ListOrdered, 
  Sparkles, 
  Ruler 
} from 'lucide-react';

export interface SidebarFeature {
  id: FeatureId;
  label: string;
  icon: any;
  enabled: boolean;
  locked?: boolean;
}

export const FEATURES: SidebarFeature[] = [
  { id: 'annotate', label: 'Annotate', icon: Pencil, enabled: true },
  { id: 'privacy', label: 'Privacy', icon: ShieldAlert, enabled: true },
  { id: 'crop_canvas', label: 'Crop & Canvas', icon: Crop, enabled: true },
  { id: 'steps_callouts', label: 'Steps & Callouts', icon: ListOrdered, enabled: true },
  { id: 'focus_polish', label: 'Focus & Polish', icon: Sparkles, enabled: true, locked: true },
  { id: 'measure_extract', label: 'Measure & Extract', icon: Ruler, enabled: true, locked: true },
];
