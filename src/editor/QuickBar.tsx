import { useState } from "react";
import { EditorPreset } from "../compose/preset";
import { composeToBlob } from "../compose/compose";
import { clipboardWriteImage, exportSavePng } from "../ipc/index";
import { RatioControl } from "./controls/Ratio";
import { SliderControl } from "./controls/Slider";
import { ShadowControl } from "./controls/Shadow";
import { BackgroundControl } from "./controls/Background";

interface Props {
  preset: EditorPreset;
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  image: HTMLImageElement;
  isActionInFlight: boolean;
  setIsActionInFlight: (v: boolean) => void;
  showToast: (m: string, t?: "success" | "error") => void;
  activePop: string | null;
  onActivePopChange: (n: string | null) => void;
}

const Icon = ({ name }: { name: string }) => {
  if (name === 'ratio') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="14" x="3" y="5" rx="2" /><path d="M7 9h10M7 15h10" /></svg>;
  if (name === 'background') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.1 2.5-.4 1.1-.4 1.8-1.4 1.8-2.6v-.3c0-1.1.9-2 2-2h.3c1.2 0 2.2-.7 2.6-1.8.3-.8.4-1.6.4-2.5 0-5.5-4.5-10-10-10z"/></svg>;
  if (name === 'chevron') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
  if (name === 'padding') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14V4h10" /><rect width="12" height="12" x="8" y="8" rx="2" /></svg>;

  if (name === 'radius') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13V7a3 3 0 0 1 3-3h6" /><path d="M14 14h.01" /></svg>;
  if (name === 'shadow') return (
    <svg width="20" height="20" viewBox="40 40 176 176">
      <defs>
          <linearGradient id="shadowStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
              <stop offset="35%" stopColor="#2563EB" stopOpacity="0" />
              <stop offset="65%" stopColor="#2563EB" stopOpacity="1" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="shadowFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
              <stop offset="40%" stopColor="#60A5FA" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3" />
          </linearGradient>
      </defs>
      <rect x="104" y="104" width="104" height="104" rx="24" fill="url(#shadowFill)" stroke="url(#shadowStroke)" strokeWidth="10" />
      <path d="M 120 80 L 160 80 A 24 24 0 0 1 184 104 L 184 160 A 24 24 0 0 1 160 184 L 104 184 A 24 24 0 0 1 80 160 L 80 120 Z" fill="#FFFFFF" />
      <path d="M 120 80 L 160 80 A 24 24 0 0 1 184 104 L 184 160 A 24 24 0 0 1 160 184 L 104 184 A 24 24 0 0 1 80 160 L 80 120" fill="none" stroke="#1E293B" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 80 48 Q 80 80 48 80 Q 80 80 80 112 Q 80 80 112 80 Q 80 80 80 48 Z" fill="#2563EB" />
    </svg>
  );
  if (name === 'copy') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
  if (name === 'export') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
  return null;
};

export function QuickBar({ 
  preset, setPreset, image, isActionInFlight, setIsActionInFlight, showToast,
  activePop, onActivePopChange 
}: Props) {
  const toggle = (n: string) => onActivePopChange(activePop === n ? null : n);

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
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: "relative", display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-pill-btn ${activePop === 'ratio' ? 'active' : ''}`} onClick={() => toggle('ratio')}>
            <Icon name="ratio" /> {preset.ratio} <Icon name="chevron" />
          </button>
          {activePop === 'ratio' && <div className="xs-pop"><RatioControl value={preset.ratio} onChange={(v) => { setPreset(p => ({ ...p, ratio: v })); onActivePopChange(null); }} /></div>}
        </div>

        <div style={{ position: "relative", display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-icon-btn ${activePop === 'background' ? 'active' : ''}`} onClick={() => toggle('background')}>
            <Icon name="background" />
          </button>
          {activePop === 'background' && (
            <div className="xs-pop">
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
          <button className={`xs-btn xs-icon-btn ${activePop === 'padding' ? 'active' : ''}`} onClick={() => toggle('padding')}><Icon name="padding" /></button>
          {activePop === 'padding' && <div className="xs-pop"><SliderControl label="Padding" min={0} max={96} value={preset.padding} onChange={v => setPreset(p => ({ ...p, padding: v }))} /></div>}
        </div>

        <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-icon-btn ${activePop === 'radius' ? 'active' : ''}`} onClick={() => toggle('radius')}><Icon name="radius" /></button>
          {activePop === 'radius' && <div className="xs-pop"><SliderControl label="Radius" min={0} max={48} value={preset.radius} onChange={v => setPreset(p => ({ ...p, radius: v }))} /></div>}
        </div>
        <div style={{ position: 'relative', display: 'flex', width: 'fit-content' }}>
          <button className={`xs-btn xs-icon-btn ${activePop === 'shadow' ? 'active' : ''}`} onClick={() => toggle('shadow')}><Icon name="shadow" /></button>
          {activePop === 'shadow' && (
            <div className="xs-pop light">
              <ShadowControl 
                preset={preset} 
                onChange={(updates) => setPreset(p => ({ ...p, ...updates }))} 
              />
            </div>
          )}
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
