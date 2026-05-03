
import { useSidebarStore, FeatureId } from './store';
import { useAnnotationStore } from '../annotate/state/store';
import { FEATURES } from './features.config';
import { 
  ChevronDown,
  ChevronUp,
  Lock,
  ArrowRight, 
  Square as SquareIcon, 
  Type, 
  Ghost, 
  Hash,
  Crop as CropIcon,
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

  const activeIndex = FEATURES.findIndex(f => f.id === activeFeatureId);
  // Rail layout: padding-top(6) + toggle(32) + gap(4) + divider(1) + gap(4) = 47px before first item
  // Each item is 34px with a 4px gap.
  const popoverOffset = activeIndex >= 0 ? 47 + (activeIndex * (34 + 4)) : 0;

  return (
    <div className="xs-sidebar-root">
      <div className={`xs-sidebar-rail ${collapsed ? 'collapsed' : ''}`}>
        {/* ... existing rail content ... */}
        <button
          className={`xs-rail-toggle ${!collapsed ? 'active' : ''}`}
          onClick={toggle}
          title={collapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {!collapsed && (
          <>
            <div className="xs-rail-divider" />
            {FEATURES.map((feature) => (
              <button
                key={feature.id}
                className={`xs-rail-item ${activeFeatureId === feature.id ? 'active' : ''} ${feature.locked ? 'locked' : ''}`}
                onClick={() => handleFeatureClick(feature.id, feature.locked)}
                disabled={!feature.enabled}
                title={feature.label}
              >
                <feature.icon size={20} />
                {feature.locked && (
                  <div className="xs-lock-dot">
                    <Lock size={7} />
                  </div>
                )}
              </button>
            ))}
          </>
        )}
      </div>

      {activeFeatureId && !collapsed && (
        <div style={{ marginTop: `${popoverOffset}px` }}>
          <FeaturePopover featureId={activeFeatureId} onClose={closeFeature} />
        </div>
      )}
    </div>
  );
}

function FeaturePopover({ featureId, onClose }: { featureId: FeatureId; onClose: () => void }) {
  const feature = FEATURES.find(f => f.id === featureId);
  if (!feature) return null;

  return (
    <div className="xs-sidebar-popover">
      <div className="xs-popover-content">
        {featureId === 'annotate' && <AnnotateTools onClose={onClose} />}
        {featureId === 'privacy' && <PrivacyTools onClose={onClose} />}
        {featureId === 'steps_callouts' && <StepsTools onClose={onClose} />}
        {featureId === 'crop_canvas' && <CropTools onClose={onClose} />}
        {feature.locked && (
          <div className="xs-locked-msg">Coming soon</div>
        )}
      </div>
    </div>
  );
}

// Each tool row: icon only, label as title/tooltip
function ToolGrid({ tools, onClose }: { tools: any[]; onClose: () => void }) {
  const { activeTool, setActiveTool } = useAnnotationStore();

  const handleToolClick = (id: string) => {
    setActiveTool(id as any);
    onClose(); // auto-close popover after tool selection
  };

  return (
    <div className="xs-tool-icon-stack">
      {tools.map(tool => (
        <button 
          key={tool.id} 
          className={`xs-tool-icon-btn ${activeTool === tool.id ? 'active' : ''} ${tool.disabled ? 'disabled' : ''}`}
          onClick={() => !tool.disabled && handleToolClick(tool.id)}
          title={tool.hint || tool.label}
          disabled={tool.disabled}
        >
          <tool.icon size={18} />
        </button>
      ))}
    </div>
  );
}

function AnnotateTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'arrow',     label: 'Arrow',     icon: ArrowRight,  hint: 'Arrow — drag on canvas' },
    { id: 'rectangle', label: 'Rectangle', icon: SquareIcon,  hint: 'Rectangle — drag on canvas' },
    { id: 'text',      label: 'Text',      icon: Type,        hint: 'Text — click on canvas' },
  ];
  return <ToolGrid tools={tools} onClose={onClose} />;
}

function PrivacyTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'blur', label: 'Blur', icon: Ghost, hint: 'Blur — drag on canvas' },
  ];
  return <ToolGrid tools={tools} onClose={onClose} />;
}

function StepsTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'numbered', label: 'Numbered Steps', icon: Hash, hint: 'Numbered Steps — click on canvas' },
  ];
  return <ToolGrid tools={tools} onClose={onClose} />;
}

function CropTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'crop',   label: 'Crop',        icon: CropIcon, hint: 'Crop — drag handles to crop' },
    { id: 'canvas', label: 'Canvas Size', icon: SquareIcon, hint: 'Canvas Size — coming soon', disabled: true },
  ];
  return <ToolGrid tools={tools} onClose={onClose} />;
}
