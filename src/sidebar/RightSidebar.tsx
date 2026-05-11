import { useLayoutEffect, useRef, useState } from 'react';
import { useSidebarStore, FeatureId } from './store';
import { useAnnotationStore } from '../annotate/state/store';
import { ToolId } from '../annotate/state/types';
import { useMeasureStore, MeasureUtilityToolId } from '../measure/store';
import { FEATURES } from './features.config';
import { LucideIcon } from 'lucide-react';

interface BaseFeatureToolItem {
  label: string;
  icon: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  hint?: string;
  disabled?: boolean;
}
interface AnnotationFeatureToolItem extends BaseFeatureToolItem {
  id: ToolId;
  isUtility?: false;
}
interface UtilityFeatureToolItem extends BaseFeatureToolItem {
  id: MeasureUtilityToolId;
  isUtility: true;
}
type FeatureToolItem = AnnotationFeatureToolItem | UtilityFeatureToolItem;
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
  MessageSquare,
  MousePointer2,
  PencilLine,
  Grid3X3,
} from 'lucide-react';
import './Sidebar.css';

const SHOW_SMART_REDACT_TOOL = false;

export function RightSidebar() {
  const { activeFeatureId, collapsed, toggle, openFeature, closeFeature } = useSidebarStore();
  const railRef = useRef<HTMLDivElement | null>(null);
  const featureRefs = useRef<Partial<Record<FeatureId, HTMLButtonElement | null>>>({});
  const [popoverAnchorTop, setPopoverAnchorTop] = useState<number>(0);

  const handleFeatureClick = (id: FeatureId, locked?: boolean) => {
    if (locked) return;
    if (activeFeatureId === id) {
      closeFeature();
    } else {
      openFeature(id);
    }
  };

  useLayoutEffect(() => {
    if (!activeFeatureId || collapsed) return;

    const updateAnchorTop = () => {
      const rail = railRef.current;
      const feature = featureRefs.current[activeFeatureId];
      if (!rail || !feature) return;

      const railRect = rail.getBoundingClientRect();
      const featureRect = feature.getBoundingClientRect();
      const nextTop = (featureRect.top - railRect.top) + (featureRect.height / 2);
      setPopoverAnchorTop(nextTop);
    };

    updateAnchorTop();
    window.addEventListener('resize', updateAnchorTop);
    return () => window.removeEventListener('resize', updateAnchorTop);
  }, [activeFeatureId, collapsed]);

  return (
    <div className="xs-sidebar-root">
      <div
        ref={railRef}
        className={`xs-sidebar-rail ${collapsed ? 'collapsed' : ''}`}
      >
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
                ref={(node) => {
                  featureRefs.current[feature.id] = node;
                }}
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
        <div
          className="xs-popover-anchor"
          style={{ top: `${popoverAnchorTop}px` }}
        >
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
  ] satisfies AnnotationFeatureToolItem[];
  return <ToolGrid tools={tools} onClose={onClose} />;
}

function MeasureTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'grid_overlay', label: 'Grid Overlay', icon: Grid, hint: 'Grid Overlay — layout alignment helper', isUtility: true },
    { id: 'color_picker', label: 'Color Picker', icon: Pipette, hint: 'Color Picker — sample pixels', isUtility: true },
    { id: 'pixel_ruler', label: 'Pixel Ruler', icon: Ruler, hint: 'Pixel Ruler — drag to measure' },
    { id: 'ocr_extract', label: 'OCR Extract Text', icon: ScanText, hint: 'OCR — drag to extract text', isUtility: true },
  ] satisfies FeatureToolItem[];
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
function ToolGrid({ tools, onClose }: { tools: FeatureToolItem[]; onClose: () => void }) {
  const { activeTool, setActiveTool } = useAnnotationStore();
  const { activeUtility, setActiveUtility, setGridVisible, gridVisible } = useMeasureStore();

  const handleToolClick = (tool: FeatureToolItem) => {
    if (tool.isUtility) {
      if (tool.id === 'grid_overlay') {
        setGridVisible(!gridVisible);
        // Leave activeUtility as is for passive grid
      } else {
        const nextUtility = activeUtility === tool.id ? null : tool.id;
        setActiveUtility(nextUtility);
        setActiveTool('select');
      }
    } else {
      setActiveTool(tool.id);
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
  ] satisfies AnnotationFeatureToolItem[];
  return <ToolGrid tools={tools} onClose={onClose} />;
}

function PrivacyTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'blur', label: 'Blur', icon: Ghost, hint: 'Blur — drag on canvas' },
    { id: 'pixelate', label: 'Pixelate', icon: Grid3X3, hint: 'Pixelate — drag on canvas' },
    { id: 'opaque_redact', label: 'Opaque Redact', icon: SquareIcon, hint: 'Opaque Redact — drag on canvas' },
    ...(SHOW_SMART_REDACT_TOOL
      ? [{ id: 'smart_redact_ai', label: 'Smart Redact AI', icon: Sparkles, hint: 'Smart Redact AI — auto-detect text', isUtility: true } satisfies FeatureToolItem]
      : []),
  ] satisfies FeatureToolItem[];
  return <ToolGrid tools={tools} onClose={onClose} />;
}

function StepsTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'numbered', label: 'Numbered Steps', icon: Hash, hint: 'Numbered Steps — click on canvas' },
    { id: 'speech_bubble', label: 'Speech Bubble', icon: MessageSquare, hint: 'Speech Bubble — click on canvas' },
    { id: 'callout', label: 'Callout', icon: MousePointer2, hint: 'Callout — drag from target to label' },
    { id: 'freehand_arrow', label: 'Freehand Arrow', icon: PencilLine, hint: 'Freehand Arrow — drag to sketch' },
  ] satisfies AnnotationFeatureToolItem[];
  return <ToolGrid tools={tools} onClose={onClose} />;
}

function CropTools({ onClose }: { onClose: () => void }) {
  const tools = [
    { id: 'crop', label: 'Crop', icon: CropIcon, hint: 'Crop — drag handles to crop' },

  ] satisfies AnnotationFeatureToolItem[];
  return <ToolGrid tools={tools} onClose={onClose} />;
}
