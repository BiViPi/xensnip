import { EditorPreset } from "../../compose/preset";

interface Props {
  preset: EditorPreset;
  onChange: (updates: Partial<EditorPreset>) => void;
}

export function ShadowControl({ preset, onChange }: Props) {
  return (
    <div style={{ width: "220px", padding: "4px" }}>
      {/* Enable Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Shadow</span>
        <input 
          type="checkbox" 
          checked={preset.shadow_enabled}
          onChange={(e) => onChange({ shadow_enabled: e.target.checked })}
          style={{ cursor: "pointer" }}
        />
      </div>

      {preset.shadow_enabled && (
        <>
          {/* Opacity */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>OPACITY</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>{Math.round(preset.shadow_opacity * 100)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.01"
            value={preset.shadow_opacity}
            onChange={(e) => onChange({ shadow_opacity: parseFloat(e.target.value) })}
            style={{ width: "100%", marginBottom: "12px", cursor: "pointer" }}
          />

          {/* Angle */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>ANGLE</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>{preset.shadow_angle}°</span>
          </div>
          <input 
            type="range" min="0" max="360" step="1"
            value={preset.shadow_angle}
            onChange={(e) => onChange({ shadow_angle: parseInt(e.target.value) })}
            style={{ width: "100%", marginBottom: "12px", cursor: "pointer" }}
          />

          {/* Blur */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>BLUR</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>{preset.shadow_blur}px</span>
          </div>
          <input 
            type="range" min="0" max="100" step="1"
            value={preset.shadow_blur}
            onChange={(e) => onChange({ shadow_blur: parseInt(e.target.value) })}
            style={{ width: "100%", marginBottom: "12px", cursor: "pointer" }}
          />

          {/* Offset/Distance */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>OFFSET</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>{preset.shadow_offset}px</span>
          </div>
          <input 
            type="range" min="0" max="100" step="1"
            value={preset.shadow_offset}
            onChange={(e) => onChange({ shadow_offset: parseInt(e.target.value) })}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </>
      )}
    </div>
  );
}
