import { EditorPreset } from "../compose/preset";
import { 
  RatioIcon, BackgroundIcon, PaddingIcon, RadiusIcon, 
  ShadowIcon, PresetIcon, ChevronIcon, CopyIcon, ExportIcon 
} from "../components/icons";
import { composeToBlob } from "../compose/compose";
import { composeWithAnnotations } from "../compose/composeWithAnnotations";
import { useAnnotationStore, useHasAnnotations } from "../annotate/state/store";
import copySound from "../assets/sounds/copy.ogg";
import exportSound from "../assets/sounds/export.ogg";
import { clipboardWriteImage, exportSaveMedia } from "../ipc/index";
import { Settings } from "../ipc/types";
import { RatioControl } from "./controls/Ratio";
import { SliderControl } from "./controls/Slider";
import { ShadowControl } from "./controls/Shadow";
import { BackgroundControl } from "./controls/Background";
import { PresetsControl } from "./controls/Presets";

interface Props {
  preset: EditorPreset;
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  image: HTMLImageElement;
  isActionInFlight: boolean;
  setIsActionInFlight: (v: boolean) => void;
  showToast: (m: string, t?: "success" | "error") => void;
  activePop: string | null;
  onActivePopChange: (n: string | null) => void;
  settings: Settings | null;
  onRefreshSettings: () => void;
  onOpenPresetManager: () => void;
}

export function QuickBar({
  preset, setPreset, image, isActionInFlight, setIsActionInFlight, showToast,
  activePop, onActivePopChange, settings, onRefreshSettings, onOpenPresetManager
}: Props) {
  const hasAnnotations = useHasAnnotations();
  const clearAll = useAnnotationStore(s => s.clearAll);
  const toggle = (n: string) => onActivePopChange(activePop === n ? null : n);

  const objects = useAnnotationStore(s => s.objects);

  const handleCopy = async () => {
    if (isActionInFlight) return;
    setIsActionInFlight(true);
    try {
      const bytes = objects.length > 0 
        ? await composeWithAnnotations(image, preset, objects)
        : await composeToBlob(image, preset);
      
      await clipboardWriteImage(bytes);
      if (settings?.play_copy_sound) {
        new Audio(copySound).play().catch(() => {});
      }
      showToast("Copied", "success");
    } finally { setIsActionInFlight(false); }
  };

  const handleExport = async () => {
    if (isActionInFlight) return;
    if (!settings?.export_folder) {
      showToast("Please select a save folder in Settings first", "error");
      return;
    }
    
    setIsActionInFlight(true);
    try {
      const format = settings.export_format === "JPEG" ? "image/jpeg" : "image/png";
      const ext = settings.export_format === "JPEG" ? "jpg" : "png";
      
      const bytes = objects.length > 0
        ? await composeWithAnnotations(image, preset, objects, format, 1.0)
        : await composeToBlob(image, preset, format, 1.0);
      
      const saved = await exportSaveMedia(bytes, settings.export_folder, `xensnip-${Date.now()}.${ext}`);
      if (saved) {
        if (settings.play_save_sound) {
          new Audio(exportSound).play().catch(() => {});
        }
        showToast("Saved", "success");
      }
    } catch (err) {
      showToast("Failed to save image", "error");
      console.error(err);
    } finally { setIsActionInFlight(false); }
  };

  return (
    <div className="xs-dock">
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: "relative", display: 'flex', width: 'fit-content' }}>
          <button 
            className={`xs-btn xs-pill-btn ${activePop === 'ratio' ? 'active' : ''}`}
            onClick={() => toggle('ratio')}
          >
            <RatioIcon /> {preset.ratio} <ChevronIcon />
          </button>
          {activePop === 'ratio' && (
            <div className="xs-pop">
              {hasAnnotations ? (
                <div className="xs-ratio-warning">
                  <div className="xs-ratio-warning-title">Change aspect ratio?</div>
                  <div className="xs-ratio-warning-text">
                    Changing the aspect ratio requires removing all annotations.
                  </div>
                  <div className="xs-ratio-warning-actions">
                    <button
                      className="xs-btn xs-btn-ghost"
                      onClick={() => onActivePopChange(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="xs-btn xs-btn-danger"
                      onClick={() => clearAll()}
                    >
                      Delete annotations
                    </button>
                  </div>
                </div>
              ) : (
                <RatioControl
                  value={preset.ratio}
                  onChange={(v) => {
                    setPreset(p => ({ ...p, ratio: v }));
                    onActivePopChange(null);
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative", display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-icon-btn ${activePop === 'background' ? 'active' : ''}`} onClick={() => toggle('background')}>
            <BackgroundIcon />
          </button>
          {activePop === 'background' && (
            <div className="xs-pop background-pop">
              <BackgroundControl
                preset={preset}
                onChange={(updates) => setPreset(p => ({ ...p, ...updates }))}
              />
            </div>
          )}
        </div>
      </div>

      <div className="xs-divider" />

      <div style={{ display: 'flex', gap: '2px' }}>
        <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-icon-btn ${activePop === 'padding' ? 'active' : ''}`} onClick={() => toggle('padding')}><PaddingIcon /></button>
          {activePop === 'padding' && <div className="xs-pop"><SliderControl label="Padding" min={0} max={96} value={preset.padding} onChange={v => setPreset(p => ({ ...p, padding: v }))} /></div>}
        </div>

        <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-icon-btn ${activePop === 'radius' ? 'active' : ''}`} onClick={() => toggle('radius')}><RadiusIcon /></button>
          {activePop === 'radius' && (
            <div className="xs-pop" style={{ minWidth: '240px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <SliderControl label="Radius" min={0} max={48} value={preset.radius} onChange={v => setPreset(p => ({ ...p, radius: v }))} />
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 4px' }} />
                <SliderControl label="Border" min={0} max={32} value={preset.border_width} onChange={v => setPreset(p => ({ ...p, border_width: v }))} />
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-icon-btn ${activePop === 'shadow' ? 'active' : ''}`} onClick={() => toggle('shadow')}><ShadowIcon /></button>
          {activePop === 'shadow' && (
            <div className="xs-pop light">
              <ShadowControl
                preset={preset}
                onChange={(updates) => setPreset(p => ({ ...p, ...updates }))}
              />
            </div>
          )}
        </div>

        <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-icon-btn ${activePop === 'presets' ? 'active' : ''}`} onClick={() => toggle('presets')}><PresetIcon /></button>
          {activePop === 'presets' && (
            <div className="xs-pop">
              <PresetsControl
                preset={preset}
                settings={settings}
                onApply={(p) => { setPreset(p); onActivePopChange(null); }}
                onRefresh={onRefreshSettings}
                showToast={showToast}
                onOpenManager={() => { onOpenPresetManager(); onActivePopChange(null); }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="xs-divider" />

      <div style={{ display: 'flex', gap: '6px' }}>
        <button className="xs-btn xs-action-primary" onClick={handleCopy} disabled={isActionInFlight}><CopyIcon /> Copy</button>
        <button className="xs-btn xs-action-secondary" onClick={handleExport} disabled={isActionInFlight}><ExportIcon /> Export</button>
      </div>
    </div>
  );
}
