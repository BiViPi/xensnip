import { EditorPreset } from "../compose/preset";
import { composeToBlob } from "../compose/compose";
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
}

const Icon = ({ name }: { name: string }) => {
  if (name === 'ratio') return (
    <svg width="24" height="24" viewBox="80 100 310 270" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad_ratio" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2D5BFF" />
          <stop offset="100%" stopColor="#41A5FF" />
        </linearGradient>
        <filter id="shadow_ratio" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="15" floodColor="#0A1E40" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect x="210" y="110" width="170" height="250" rx="24" fill="#FFFFFF" stroke="url(#grad_ratio)" strokeWidth="14" filter="url(#shadow_ratio)" />
      <rect x="90" y="200" width="250" height="160" rx="28" fill="#FFFFFF" stroke="#0B132B" strokeWidth="16" filter="url(#shadow_ratio)" />
      <g stroke="url(#grad_ratio)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="175" y1="320" x2="255" y2="240" />
        <polyline points="225,240 255,240 255,270" />
        <polyline points="205,320 175,320 175,290" />
      </g>
    </svg>
  );
  if (name === 'background') return (
    <svg width="24" height="24" viewBox="70 90 340 305" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad_bg_win" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B70FF" />
          <stop offset="50%" stopColor="#C552FF" />
          <stop offset="100%" stopColor="#FF935B" />
        </linearGradient>
        <linearGradient id="grad_bg_img" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6CA1FF" />
          <stop offset="100%" stopColor="#2464F1" />
        </linearGradient>
        <filter id="glow_bg" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="shadow_bg_fg" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="15" stdDeviation="18" floodColor="#0A1E40" floodOpacity="0.25" />
        </filter>
        <clipPath id="clip_bg_win"><rect x="110" y="100" width="290" height="210" rx="24" /></clipPath>
        <clipPath id="clip_bg_img"><rect x="110" y="270" width="110" height="95" rx="12" /></clipPath>
      </defs>
      <rect x="110" y="100" width="290" height="210" rx="24" fill="url(#grad_bg_win)" filter="url(#glow_bg)" opacity="0.65" />
      <rect x="110" y="100" width="290" height="210" rx="24" fill="url(#grad_bg_win)" />
      <path d="M 110 220 Q 200 160 300 240 T 400 150 L 400 310 L 110 310 Z" fill="#FFFFFF" opacity="0.15" clipPath="url(#clip_bg_win)" />
      <rect x="110" y="100" width="290" height="210" rx="24" fill="none" stroke="#0B132B" strokeWidth="10" />
      <rect x="80" y="210" width="260" height="175" rx="20" fill="#FFFFFF" stroke="#0B132B" strokeWidth="10" filter="url(#shadow_bg_fg)" />
      <circle cx="115" cy="240" r="7" fill="#FF5F5A" />
      <circle cx="138" cy="240" r="7" fill="#FFBC2E" />
      <circle cx="161" cy="240" r="7" fill="#28CA42" />
      <rect x="250" y="237" width="65" height="7" rx="3.5" fill="#D3DBE8" />
      <rect x="110" y="270" width="110" height="95" rx="12" fill="url(#grad_bg_img)" />
      <g clipPath="url(#clip_bg_img)">
        <circle cx="185" cy="295" r="11" fill="#E2EDFF" opacity="0.9" />
        <polygon points="85,380 145,305 205,380" fill="#1C52D2" />
        <polygon points="140,380 190,325 240,380" fill="#3676FF" />
      </g>
      <rect x="240" y="275" width="85" height="8" rx="4" fill="#D3DBE8" />
      <rect x="240" y="300" width="85" height="8" rx="4" fill="#D3DBE8" />
      <rect x="240" y="325" width="65" height="8" rx="4" fill="#D3DBE8" />
      <rect x="240" y="350" width="38" height="8" rx="4" fill="#D3DBE8" />
    </svg>
  );
  if (name === 'chevron') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
  if (name === 'padding') return (
    <svg width="24" height="24" viewBox="60 60 380 380" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad_pad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#05C3FF" />
          <stop offset="100%" stopColor="#0A36E8" />
        </linearGradient>
        <filter id="shadow_pad" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="15" floodColor="#0A2050" floodOpacity="0.15" />
        </filter>
        <g id="arrow_pad">
          <line x1="250" y1="80" x2="250" y2="135" fill="none" stroke="url(#grad_pad)" strokeWidth="12" strokeLinecap="round" />
          <polyline points="233,97 250,80 267,97" fill="none" stroke="url(#grad_pad)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="233,118 250,135 267,118" fill="none" stroke="url(#grad_pad)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </defs>
      <rect x="70" y="70" width="360" height="360" rx="48" fill="none" stroke="url(#grad_pad)" strokeWidth="10" strokeLinecap="round" strokeDasharray="22 28" />
      <use href="#arrow_pad" />
      <use href="#arrow_pad" transform="rotate(90 250 250)" />
      <use href="#arrow_pad" transform="rotate(180 250 250)" />
      <use href="#arrow_pad" transform="rotate(270 250 250)" />
      <rect x="155" y="155" width="190" height="190" rx="28" fill="#F2F6FF" stroke="#161E36" strokeWidth="14" filter="url(#shadow_pad)" />
    </svg>
  );
  if (name === 'radius') return (
    <svg width="24" height="24" viewBox="30 30 196 196" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad_rad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <filter id="glow_rad" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#2563EB" floodOpacity="0.45" />
        </filter>
      </defs>
      <circle cx="88" cy="96" r="14" fill="#64748B" />
      <path d="M 56 186 L 94 140 A 6 6 0 0 1 104 140 L 132 174 L 148 120 A 6 6 0 0 1 158 120 L 200 180 L 200 196 A 8 8 0 0 1 192 204 L 64 204 A 8 8 0 0 1 56 196 Z" fill="#64748B" />
      <path d="M 128 44 L 76 44 A 32 32 0 0 0 44 76 L 44 180 A 32 32 0 0 0 76 212 L 180 212 A 32 32 0 0 0 212 180 L 212 128" fill="none" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
      <path d="M 144 44 L 180 44 A 32 32 0 0 1 212 76 L 212 112" fill="none" stroke="url(#grad_rad)" strokeWidth="12" strokeLinecap="round" />
      <g fill="#2563EB"><circle cx="132" cy="60" r="4" /><circle cx="196" cy="124" r="4" /></g>
      <path d="M 140 60 A 56 56 0 0 1 196 116" fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 10" />
      <g transform="translate(192, 192)">
        <circle cx="0" cy="0" r="24" fill="#FFFFFF" filter="url(#glow_rad)" />
        <circle cx="0" cy="0" r="24" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="24" fill="none" stroke="#2563EB" strokeWidth="4.5" />
        <path d="M -8 -4 A 10 10 0 0 1 6 6" fill="none" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 6 -2 L 6 6 L -2 6" fill="none" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
  if (name === 'shadow') return (
    <svg width="24" height="24" viewBox="40 40 176 176">
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
  if (name === 'preset') return (
    <svg width="24" height="24" viewBox="65 60 270 270" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="edge-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1.0"/>
          <stop offset="20%" stopColor="#ffffff" stopOpacity="0.4"/>
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.0"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3"/>
        </linearGradient>
        <linearGradient id="bg-card-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9358ff"/>
          <stop offset="50%" stopColor="#ff66c4"/>
          <stop offset="100%" stopColor="#ff9b5e"/>
        </linearGradient>
        <linearGradient id="bg-card-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6e50ff"/>
          <stop offset="50%" stopColor="#d147ff"/>
          <stop offset="100%" stopColor="#ff549a"/>
        </linearGradient>
        <linearGradient id="slider-fill-1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#647eff"/>
          <stop offset="100%" stopColor="#b875ff"/>
        </linearGradient>
        <linearGradient id="slider-fill-2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c144ff"/>
          <stop offset="100%" stopColor="#ff548e"/>
        </linearGradient>
        <linearGradient id="slider-fill-3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff8b3d"/>
          <stop offset="100%" stopColor="#ffc14d"/>
        </linearGradient>
        <radialGradient id="knob-1" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#d2b3ff"/>
          <stop offset="40%" stopColor="#a66cff"/>
          <stop offset="100%" stopColor="#5522d9"/>
        </radialGradient>
        <radialGradient id="knob-2" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffb3ce"/>
          <stop offset="40%" stopColor="#ff5c99"/>
          <stop offset="100%" stopColor="#d12065"/>
        </radialGradient>
        <radialGradient id="knob-3" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffdcb3"/>
          <stop offset="40%" stopColor="#ff9e40"/>
          <stop offset="100%" stopColor="#c2570e"/>
        </radialGradient>
        <linearGradient id="bookmark-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5e8cff"/>
          <stop offset="100%" stopColor="#1935c9"/>
        </linearGradient>
      </defs>
      <g>
        <rect x="130" y="60" width="170" height="170" rx="30" fill="url(#bg-card-1)"/>
        <rect x="131" y="61" width="168" height="168" rx="29" fill="none" stroke="url(#edge-highlight)" strokeWidth="2"/>
      </g>
      <g>
        <rect x="100" y="90" width="170" height="170" rx="30" fill="url(#bg-card-2)"/>
        <rect x="101" y="91" width="168" height="168" rx="29" fill="none" stroke="url(#edge-highlight)" strokeWidth="2"/>
      </g>
      <g>
        <rect x="70" y="120" width="180" height="180" rx="30" fill="#1b1e2e"/>
        <rect x="71" y="121" width="178" height="178" rx="29" fill="none" stroke="url(#edge-highlight)" strokeWidth="2"/>
      </g>
      <g id="ui-elements">
        <g id="row-1">
          <path d="M 95 158 L 90 158 L 90 163 M 90 167 L 90 172 L 95 172 M 105 158 L 110 158 L 110 163 M 110 167 L 110 172 L 105 172" fill="none" stroke="#8c77ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="135" y="162" width="90" height="6" rx="3" fill="#0d0f18"/>
          <rect x="135" y="162" width="60" height="6" rx="3" fill="url(#slider-fill-1)"/>
          <circle cx="195" cy="165" r="9.5" fill="url(#knob-1)"/>
        </g>
        <g id="row-2">
          <rect x="90" y="210" width="20" height="16" rx="3.5" fill="none" stroke="#d56cff" strokeWidth="2.5" strokeLinejoin="round"/>
          <circle cx="96" cy="215" r="2.5" fill="#d56cff"/>
          <path d="M 90 224 L 97 217 L 101 221 L 105 216 L 110 222" fill="none" stroke="#d56cff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="135" y="212" width="90" height="6" rx="3" fill="#0d0f18"/>
          <rect x="135" y="212" width="45" height="6" rx="3" fill="url(#slider-fill-2)"/>
          <circle cx="180" cy="215" r="9.5" fill="url(#knob-2)"/>
        </g>
        <g id="row-3">
          <rect x="91" y="261" width="18" height="18" rx="4" fill="none" stroke="#ff9f4a" strokeWidth="2.5" strokeDasharray="5 4.5" strokeDashoffset="1" strokeLinecap="round"/>
          <rect x="135" y="267" width="90" height="6" rx="3" fill="#0d0f18"/>
          <rect x="135" y="267" width="30" height="6" rx="3" fill="url(#slider-fill-3)"/>
          <circle cx="165" cy="270" r="9.5" fill="url(#knob-3)"/>
        </g>
      </g>
      <g id="bookmark-group">
        <path d="M 215 255 Q 210 255 210 260 L 210 330 L 237.5 310 L 265 330 L 265 260 Q 265 255 260 255 Z" fill="url(#bookmark-grad)"/>
        <path d="M 215 256 Q 211 256 211 261 L 211 327 L 237.5 309 L 264 327 L 264 261 Q 264 256 260 256 Z" fill="none" stroke="url(#edge-highlight)" strokeWidth="1.5"/>
        <path d="M 237.5 272 L 240.5 280 L 248.5 281 L 242 286 L 244 294 L 237.5 289.5 L 231 294 L 233 286 L 226.5 281 L 234.5 280 Z" fill="#f0f5ff" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round"/>
      </g>
    </svg>
  );
  return null;
};

export function QuickBar({
  preset, setPreset, image, isActionInFlight, setIsActionInFlight, showToast,
  activePop, onActivePopChange, settings, onRefreshSettings
}: Props) {
  const toggle = (n: string) => onActivePopChange(activePop === n ? null : n);

  const handleCopy = async () => {
    if (isActionInFlight) return;
    setIsActionInFlight(true);
    try {
      const blob = await composeToBlob(image, preset);
      await clipboardWriteImage(blob);
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
      const blob = await composeToBlob(image, preset, format, 1.0);
      
      const saved = await exportSaveMedia(blob, settings.export_folder, `xensnip-${Date.now()}.${ext}`);
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
          <button className={`xs-btn xs-icon-btn ${activePop === 'presets' ? 'active' : ''}`} onClick={() => toggle('presets')}><Icon name="preset" /></button>
          {activePop === 'presets' && (
            <div className="xs-pop">
              <PresetsControl
                preset={preset}
                savedPresets={settings?.saved_presets || []}
                onApply={(p) => { setPreset(p); onActivePopChange(null); }}
                onRefresh={onRefreshSettings}
                showToast={showToast}
              />
            </div>
          )}
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
