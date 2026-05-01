import { useState } from "react";
import { EditorPreset, BACKGROUND_CONFIGS, BackgroundStyle } from "../compose/preset";
import { composeToBlob } from "../compose/compose";
import { clipboardWriteImage, exportSavePng } from "../ipc/index";
import { RatioControl } from "./controls/Ratio";
import { SliderControl } from "./controls/Slider";
import { ShadowControl } from "./controls/Shadow";

interface Props {
  preset: EditorPreset;
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  image: HTMLImageElement;
  isActionInFlight: boolean;
  setIsActionInFlight: (v: boolean) => void;
  showToast: (m: string, t?: "success" | "error") => void;
}

const Icon = ({ name }: { name: string }) => {
  if (name === 'ratio') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="14" x="3" y="5" rx="2" /><path d="M7 9h10M7 15h10" /></svg>;
  if (name === 'chevron') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
  if (name === 'padding') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14V4h10" /><rect width="12" height="12" x="8" y="8" rx="2" /></svg>;
  if (name === 'inset') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="2" /><rect width="12" height="12" x="6" y="6" rx="1" strokeDasharray="3 2" /></svg>;
  if (name === 'radius') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13V7a3 3 0 0 1 3-3h6" /><path d="M14 14h.01" /></svg>;
  if (name === 'shadow') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="12" height="12" x="3" y="3" rx="2" /><path d="M7 21h10a4 4 0 0 0 4-4V7" /></svg>;
  if (name === 'copy') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
  if (name === 'export') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
  return null;
};

export function QuickBar({ preset, setPreset, image, isActionInFlight, setIsActionInFlight, showToast }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const toggle = (n: string) => setActive(active === n ? null : n);

  const handleCopy = async () => {
    if (isActionInFlight) return;
    setIsActionInFlight(true);
    try {
      const blob = await composeToBlob(image, preset);
      await clipboardWriteImage(blob);
      showToast("Copied", "success");
    } finally { setIsActionInFlight(false); }
  };

  const handleExport = async () => {
    if (isActionInFlight) return;
    setIsActionInFlight(true);
    try {
      const blob = await composeToBlob(image, preset);
      const saved = await exportSavePng(blob, `xensnip-${Date.now()}.png`);
      if (saved) showToast("Saved", "success");
    } finally { setIsActionInFlight(false); }
  };

  return (
    <div className="xs-dock">
      <div style={{ position: "relative" }}>
        <button className={`xs-btn xs-pill-btn ${active === 'ratio' ? 'active' : ''}`} onClick={() => toggle('ratio')}>
          <Icon name="ratio" /> {preset.ratio} <Icon name="chevron" />
        </button>
        {active === 'ratio' && <div className="xs-pop"><RatioControl value={preset.ratio} onChange={(v) => { setPreset(p => ({ ...p, ratio: v })); setActive(null); }} /></div>}
      </div>

      <div className="xs-divider" />

      <div style={{ display: 'flex', gap: '6px' }}>
        {(Object.keys(BACKGROUND_CONFIGS) as BackgroundStyle[]).map(s => (
          <div key={s} className={`xs-swatch ${preset.background === s ? 'active' : ''}`} onClick={() => setPreset(p => ({ ...p, background: s }))} style={{ background: Array.isArray(BACKGROUND_CONFIGS[s]) ? `linear-gradient(135deg, ${(BACKGROUND_CONFIGS[s] as string[]).join(", ")})` : (BACKGROUND_CONFIGS[s] as string) }} />
        ))}
      </div>

      <div className="xs-divider" />

      <div style={{ display: 'flex', gap: '2px' }}>
        <div style={{ position: 'relative' }}>
          <button className={`xs-btn xs-icon-btn ${active === 'padding' ? 'active' : ''}`} onClick={() => toggle('padding')}><Icon name="padding" /></button>
          {active === 'padding' && <div className="xs-pop"><SliderControl label="Padding" min={0} max={96} value={preset.padding} onChange={v => setPreset(p => ({ ...p, padding: v }))} /></div>}
        </div>
        <div style={{ position: 'relative' }}>
          <button className={`xs-btn xs-icon-btn ${active === 'inset' ? 'active' : ''}`} onClick={() => toggle('inset')}><Icon name="inset" /></button>
          {active === 'inset' && <div className="xs-pop"><SliderControl label="Inset" min={0} max={96} value={preset.inset} onChange={v => setPreset(p => ({ ...p, inset: v }))} /></div>}
        </div>
        <div style={{ position: 'relative' }}>
          <button className={`xs-btn xs-icon-btn ${active === 'radius' ? 'active' : ''}`} onClick={() => toggle('radius')}><Icon name="radius" /></button>
          {active === 'radius' && <div className="xs-pop"><SliderControl label="Radius" min={0} max={48} value={preset.radius} onChange={v => setPreset(p => ({ ...p, radius: v }))} /></div>}
        </div>
        <div style={{ position: 'relative' }}>
          <button className={`xs-btn xs-icon-btn ${active === 'shadow' ? 'active' : ''}`} onClick={() => toggle('shadow')}><Icon name="shadow" /></button>
          {active === 'shadow' && <div className="xs-pop"><ShadowControl value={preset.shadow} onChange={v => { setPreset(p => ({ ...p, shadow: v })); setActive(null); }} /></div>}
        </div>
      </div>

      <div className="xs-divider" />

      <div style={{ display: 'flex', gap: '6px' }}>
        <button className="xs-btn xs-action-primary" onClick={handleCopy} disabled={isActionInFlight}><Icon name="copy" /> Copy</button>
        <button className="xs-btn xs-action-secondary" onClick={handleExport} disabled={isActionInFlight}><Icon name="export" /> Export</button>
      </div>
    </div>
  );
}
