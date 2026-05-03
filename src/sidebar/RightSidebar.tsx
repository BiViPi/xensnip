import { useSidebarStore, FeatureId } from './store';
import { useAnnotationStore } from '../annotate/state/store';
import { FEATURES } from './features.config';
import { 
  ChevronRight, 
  ChevronLeft, 
  Lock,
  MousePointer2, 
  ArrowRight, 
  Square as SquareIcon, 
  Type, 
  Ghost, 
  Hash,
  Crop as CropIcon,
  Maximize
} from 'lucide-react';
import './Sidebar.css';

export function RightSidebar() {
  const { activeFeatureId, collapsed, toggle, openFeature, closeFeature } = useSidebarStore();

  const handleFeatureClick = (id: FeatureId, locked?: boolean) => {
    if (locked) return;
    if (activeFeatureId === id) {
      closeFeature();
    } else {
      openFeature(id);
    }
  };

  return (
    <div className="xs-sidebar-root">
      <div className="xs-sidebar-rail">
        <button className="xs-rail-item" onClick={toggle}>
          {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
        <div className="xs-rail-divider" />
        
        {FEATURES.map((feature) => (
          <button
            key={feature.id}
            className={`xs-rail-item ${activeFeatureId === feature.id ? 'active' : ''}`}
            onClick={() => handleFeatureClick(feature.id, feature.locked)}
            disabled={!feature.enabled}
            title={feature.label}
          >
            <feature.icon size={20} />
            {feature.locked && (
              <div style={{ position: 'absolute', top: -2, right: -2, background: '#1e293b', borderRadius: '50%', padding: '2px' }}>
                <Lock size={8} color="#64748b" />
              </div>
            )}
          </button>
        ))}
      </div>

      {activeFeatureId && !collapsed && (
        <FeaturePopover featureId={activeFeatureId} onClose={closeFeature} />
      )}
    </div>
  );
}

function FeaturePopover({ featureId }: { featureId: FeatureId; onClose: () => void }) {
  const feature = FEATURES.find(f => f.id === featureId);
  if (!feature) return null;

  return (
    <div className="xs-sidebar-popover">
      <div className="xs-popover-header">
        <span className="xs-popover-title">{feature.label}</span>
      </div>
      <div className="xs-popover-content">
        {featureId === 'annotate' && <AnnotateTools />}
        {featureId === 'privacy' && <PrivacyTools />}
        {featureId === 'steps_callouts' && <StepsTools />}
        {featureId === 'crop_canvas' && <CropTools />}
        {feature.locked && (
           <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
             {feature.label} tools coming soon.
           </div>
        )}
      </div>
    </div>
  );
}

function ToolGrid({ tools }: { tools: any[] }) {
  const { activeTool, setActiveTool } = useAnnotationStore();

  return (
    <div className="xs-tool-grid">
      {tools.map(tool => (
        <button 
          key={tool.id} 
          className={`xs-tool-item ${activeTool === tool.id ? 'active' : ''}`}
          onClick={() => setActiveTool(tool.id as any)}
        >
          <tool.icon className="xs-tool-icon" />
          <span className="xs-tool-label">{tool.label}</span>
        </button>
      ))}
    </div>
  );
}

function AnnotateTools() {
  const tools = [
    { id: 'select', label: 'Select', icon: MousePointer2 },
    { id: 'arrow', label: 'Arrow', icon: ArrowRight },
    { id: 'rectangle', label: 'Rectangle', icon: SquareIcon },
    { id: 'text', label: 'Text', icon: Type },
  ];
  return <ToolGrid tools={tools} />;
}

function PrivacyTools() {
  const tools = [
    { id: 'blur', label: 'Blur', icon: Ghost },
  ];
  return <ToolGrid tools={tools} />;
}

function StepsTools() {
  const tools = [
    { id: 'numbered', label: 'Numbered Steps', icon: Hash },
  ];
  return <ToolGrid tools={tools} />;
}

function CropTools() {
  const tools = [
    { id: 'crop', label: 'Crop', icon: CropIcon },
    { id: 'canvas', label: 'Canvas Size', icon: Maximize },
  ];
  return <ToolGrid tools={tools} />;
}
