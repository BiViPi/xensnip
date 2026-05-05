
import { useSidebarStore, FeatureId } from './store';
import { useAnnotationStore } from '../annotate/state/store';
import { useMeasureStore } from '../measure/store';
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
  Aperture,
  Sparkles,
  ZoomIn,
  Ruler,
  Grid,
  Pipette,
  ScanText,
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
  const popoverOffset = activeIndex >= 0 ? 47 + (activeIndex * (44 + 4)) : 0;

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
                <feature.icon size={32} />
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

function FocusTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'spotlight', label: 'Simplify UI', icon: Aperture, hint: 'Simplify UI - drag on canvas' },
    { id: 'simplify_ui', label: 'Spotlight', icon: Sparkles, hint: 'Spotlight - drag on canvas' },
    { id: 'magnify', label: 'Magnify', icon: ZoomIn, hint: 'Magnify — drag on canvas' },
  ];
  return <ToolGrid tools={tools} onClose={onClose} />;
}

function MeasureTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'grid_overlay', label: 'Grid Overlay', icon: Grid, hint: 'Grid Overlay — layout alignment helper', isUtility: true },
    { id: 'color_picker', label: 'Color Picker', icon: Pipette, hint: 'Color Picker — sample pixels', isUtility: true },
    { id: 'pixel_ruler', label: 'Pixel Ruler', icon: Ruler, hint: 'Pixel Ruler — drag to measure' },
    { id: 'ocr_extract', label: 'OCR Extract Text', icon: ScanText, hint: 'OCR — drag to extract text', isUtility: true },
  ];
  return <ToolGrid tools={tools} onClose={onClose} />;
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
        {featureId === 'focus_polish' && <FocusTools onClose={onClose} />}
        {featureId === 'measure_extract' && <MeasureTools onClose={onClose} />}
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
  const { activeUtility, setActiveUtility, setGridVisible, gridVisible } = useMeasureStore();

  const handleToolClick = (tool: any) => {
    if (tool.isUtility) {
      if (tool.id === 'grid_overlay') {
        setGridVisible(!gridVisible);
        // Leave activeUtility as is for passive grid
      } else {
        const nextUtility = activeUtility === tool.id ? null : tool.id;
        setActiveUtility(nextUtility as any);
        setActiveTool('select');
      }
    } else {
      setActiveTool(tool.id as any);
      setActiveUtility(null);
    }
    onClose(); // auto-close popover after tool selection
  };

  return (
    <div className="xs-tool-icon-stack">
      {tools.map(tool => (
        <button
          key={tool.id}
          className={`xs-tool-icon-btn ${(tool.isUtility ? (tool.id === 'grid_overlay' ? gridVisible : activeUtility === tool.id) : activeTool === tool.id) ? 'active' : ''} ${tool.disabled ? 'disabled' : ''}`}
          onClick={() => !tool.disabled && handleToolClick(tool)}
          title={tool.hint || tool.label}
          disabled={tool.disabled}
        >
          <tool.icon size={24} />
        </button>
      ))}
    </div>
  );
}

function AnnotateTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'arrow', label: 'Arrow', icon: ArrowRight, hint: 'Arrow — drag on canvas' },
    { id: 'rectangle', label: 'Rectangle', icon: SquareIcon, hint: 'Rectangle — drag on canvas' },
    { id: 'text', label: 'Text', icon: Type, hint: 'Text — click on canvas' },
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
    { id: 'crop', label: 'Crop', icon: CropIcon, hint: 'Crop — drag handles to crop' },
    { id: 'canvas', label: 'Canvas Size', icon: SquareIcon, hint: 'Canvas Size — coming soon', disabled: true },
  ];
  return <ToolGrid tools={tools} onClose={onClose} />;
}
