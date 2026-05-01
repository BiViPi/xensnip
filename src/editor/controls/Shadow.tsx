import { EditorPreset } from "../../compose/preset";

interface Props {
  preset: EditorPreset;
  onChange: (updates: Partial<EditorPreset>) => void;
}

const Icon = ({ name, color = "#64748b" }: { name: string, color?: string }) => {
  if (name === "sparkle") return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
  if (name === "opacity") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  );
  if (name === "angle") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
    </svg>
  );
  if (name === "blur") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7z"/>
    </svg>
  );
  if (name === "offset") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 15 22 12 19 9"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/>
    </svg>
  );
  return null;
}

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
          <Icon name="sparkle" />
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

      <div style={{ opacity: preset.shadow_enabled ? 1 : 0.4, pointerEvents: preset.shadow_enabled ? "auto" : "none", transition: "opacity 0.2s" }}>
        {/* Opacity Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: "6px" }}>
            <Icon name="opacity" />
          </div>
          <span style={{ fontSize: "14px", color: "#475569", fontWeight: 500, width: "60px" }}>Opacity</span>
          <input 
            type="range" min="0" max="1" step="0.01"
            className="xs-slider-minimal"
            value={preset.shadow_opacity}
            onChange={(e) => onChange({ shadow_opacity: parseFloat(e.target.value) })}
            style={{ flex: 1, ...getTrackStyle(preset.shadow_opacity, 0, 1) }}
          />
          <span style={{ fontSize: "12px", color: "#64748b", width: "40px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(preset.shadow_opacity * 100)}%</span>
        </div>

        {/* Angle Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: "6px" }}>
            <Icon name="angle" />
          </div>
          <span style={{ fontSize: "14px", color: "#475569", fontWeight: 500, width: "60px" }}>Angle</span>
          <input 
            type="range" min="0" max="360" step="1"
            className="xs-slider-minimal"
            value={preset.shadow_angle}
            onChange={(e) => onChange({ shadow_angle: parseInt(e.target.value) })}
            style={{ flex: 1, ...getTrackStyle(preset.shadow_angle, 0, 360) }}
          />
          <span style={{ fontSize: "12px", color: "#64748b", width: "40px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{preset.shadow_angle}°</span>
        </div>

        {/* Blur Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: "6px" }}>
            <Icon name="blur" />
          </div>
          <span style={{ fontSize: "14px", color: "#475569", fontWeight: 500, width: "60px" }}>Blur</span>
          <input 
            type="range" min="0" max="100" step="1"
            className="xs-slider-minimal"
            value={preset.shadow_blur}
            onChange={(e) => onChange({ shadow_blur: parseInt(e.target.value) })}
            style={{ flex: 1, ...getTrackStyle(preset.shadow_blur, 0, 100) }}
          />
          <span style={{ fontSize: "12px", color: "#64748b", width: "40px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{preset.shadow_blur}px</span>
        </div>

        {/* Offset Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: "6px" }}>
            <Icon name="offset" />
          </div>
          <span style={{ fontSize: "14px", color: "#475569", fontWeight: 500, width: "60px" }}>Offset</span>
          <input 
            type="range" min="0" max="100" step="1"
            className="xs-slider-minimal"
            value={preset.shadow_offset}
            onChange={(e) => onChange({ shadow_offset: parseInt(e.target.value) })}
            style={{ flex: 1, ...getTrackStyle(preset.shadow_offset, 0, 100) }}
          />
          <span style={{ fontSize: "12px", color: "#64748b", width: "40px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{preset.shadow_offset}px</span>
        </div>
      </div>
    </div>
  );
}
