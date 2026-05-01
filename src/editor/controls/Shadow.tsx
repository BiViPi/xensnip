import { EditorPreset } from "../../compose/preset";

interface Props {
  preset: EditorPreset;
  onChange: (updates: Partial<EditorPreset>) => void;
}

const Icon = ({ name }: { name: string }) => {
  if (name === "shadow") return (
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
  if (name === "opacity") return (
    <svg width="20" height="20" viewBox="20 20 216 216">
      <defs>
          <linearGradient id="sliderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
      </defs>
      <circle cx="98" cy="120" r="38" fill="#2563EB" fillOpacity="0.1" />
      <circle cx="128" cy="120" r="38" fill="#2563EB" fillOpacity="0.35" />
      <circle cx="158" cy="120" r="38" fill="#2563EB" fillOpacity="0.85" />
      <path d="M 56 176 A 96 96 0 0 1 154 36" fill="none" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
      <path d="M 194 66 A 96 96 0 0 1 200 176" fill="none" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
      <path d="M 174 28 Q 174 52 150 52 Q 174 52 174 76 Q 174 52 198 52 Q 174 52 174 28 Z" fill="#2563EB" />
      <path d="M 76 196 L 114 196" fill="none" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
      <path d="M 142 196 L 180 196" fill="none" stroke="url(#sliderGradient)" strokeWidth="12" strokeLinecap="round" />
      <circle cx="128" cy="196" r="14" fill="#FFFFFF" stroke="#1E293B" strokeWidth="12" />
      <path d="M 123 198 A 5 5 0 0 0 133 198" fill="none" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
  if (name === "angle") return (
    <svg width="20" height="20" viewBox="20 50 216 176">
      <defs>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="arrowGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
      </defs>
      <path d="M 98 140 A 75 75 0 0 0 128 200" fill="none" stroke="url(#arcGradient)" strokeWidth="16" />
      <path d="M 143 80 L 53 200 L 203 200" fill="none" stroke="#1E293B" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(143, 80) rotate(-53.13)">
          <path d="M 42 0 L -8 20 L 8 0 L -8 -20 Z" fill="url(#arrowGradient)" stroke="url(#arrowGradient)" strokeWidth="2" strokeLinejoin="round" />
      </g>
      <path d="M 157 126 Q 157 150 133 150 Q 157 150 157 174 Q 157 150 181 150 Q 157 150 157 126 Z" fill="#38BDF8" />
    </svg>
  );
  if (name === "blur") return (
    <svg width="20" height="20" viewBox="20 40 216 176">
      <defs>
          <filter id="motionBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" />
          </filter>
      </defs>
      <circle cx="178" cy="128" r="54" fill="none" stroke="#60A5FA" strokeWidth="14" opacity="0.15" filter="url(#motionBlur)" />
      <circle cx="148" cy="128" r="54" fill="none" stroke="#38BDF8" strokeWidth="14" opacity="0.35" filter="url(#motionBlur)" />
      <circle cx="118" cy="128" r="54" fill="none" stroke="#2563EB" strokeWidth="14" opacity="0.7" filter="url(#motionBlur)" />
      <circle cx="94" cy="128" r="58" fill="#FFFFFF" stroke="#1E293B" strokeWidth="14" />
      <path d="M 94 85 Q 94 128 51 128 Q 94 128 94 171 Q 94 128 137 128 Q 94 128 94 85 Z" fill="#2563EB" />
    </svg>
  );
  if (name === "offset") return (
    <svg width="20" height="20" viewBox="20 40 216 176">
      <defs>
          <linearGradient id="bgScaleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.8"/>
          </linearGradient>
      </defs>
      <rect x="88" y="92" width="128" height="100" rx="16" fill="url(#bgScaleGradient)" />
      <g stroke="#2563EB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 175 160 L 215 190" />
          <path d="M 175 172 L 175 160 L 187 160" />
          <path d="M 203 190 L 215 190 L 215 178" />
      </g>
      <rect x="44" y="60" width="128" height="96" rx="16" fill="#FFFFFF" stroke="#0F172A" strokeWidth="12" />
    </svg>
  );
  return null;
};

export function ShadowControl({ preset, onChange }: Props) {
  const getTrackStyle = (val: number, min: number, max: number) => {
    const pct = ((val - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, #f1f5f9 ${pct}%, #f1f5f9 100%)`
    };
  };

  return (
    <div style={{ width: "260px", padding: "8px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
          <Icon name="shadow" />
          <span style={{ fontSize: "15px", fontWeight: 700 }}>Shadow</span>
        </div>
        <div 
          onClick={() => onChange({ shadow_enabled: !preset.shadow_enabled })}
          style={{ 
            width: "40px", height: "22px", 
            backgroundColor: preset.shadow_enabled ? "#3b82f6" : "#e2e8f0",
            borderRadius: "11px", position: "relative", cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          <div style={{ 
            width: "18px", height: "18px", backgroundColor: "white", 
            borderRadius: "50%", position: "absolute", top: "2px",
            left: preset.shadow_enabled ? "20px" : "2px",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
          }} />
        </div>
      </div>

      <div style={{ 
        opacity: preset.shadow_enabled ? 1 : 0.4, 
        pointerEvents: preset.shadow_enabled ? "auto" : "none", 
        transition: "opacity 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}>
        {/* Row Template: [Icon] [Label] [Slider] [Value] */}
        {[
          { id: "opacity", label: "Opacity", value: preset.shadow_opacity, min: 0, max: 1, step: 0.01, unit: "%", displayVal: Math.round(preset.shadow_opacity * 100) },
          { id: "angle", label: "Angle", value: preset.shadow_angle, min: 0, max: 360, step: 1, unit: "°", displayVal: preset.shadow_angle },
          { id: "blur", label: "Blur", value: preset.shadow_blur, min: 0, max: 100, step: 1, unit: "px", displayVal: preset.shadow_blur },
          { id: "offset", label: "Offset", value: preset.shadow_offset, min: 0, max: 100, step: 1, unit: "px", displayVal: preset.shadow_offset }
        ].map((item) => (
          <div key={item.id} style={{ 
            display: "grid", 
            gridTemplateColumns: "24px 60px 1fr 40px", 
            alignItems: "center", 
            gap: "12px" 
          }}>
            <div style={{ 
              width: "24px", height: "24px", 
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Icon name={item.id} />
            </div>
            <span style={{ fontSize: "14px", color: "#475569", fontWeight: 500 }}>{item.label}</span>
            <input 
              type="range" 
              min={item.min} max={item.max} step={item.step}
              className="xs-slider-minimal"
              value={item.value}
              onChange={(e) => onChange({ [`shadow_${item.id}`]: parseFloat(e.target.value) })}
              style={{ width: "100%", ...getTrackStyle(item.value, item.min, item.max) }}
            />
            <span style={{ 
              fontSize: "12px", color: "#64748b", 
              textAlign: "right", fontVariantNumeric: "tabular-nums" 
            }}>
              {item.displayVal}{item.unit}
            </span>
          </div>
        ))}
      </div>
    </div>

  );
}
