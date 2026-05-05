import { EditorPreset } from "../../compose/preset";
import { ShadowPanelIcon, OpacityIcon, AngleIcon, BlurIcon, OffsetIcon } from "../../components/icons";

interface Props {
  preset: EditorPreset;
  onChange: (updates: Partial<EditorPreset>) => void;
}
export function ShadowControl({ preset, onChange }: Props) {
  return (
    <div className="shadow-control-panel" style={{ width: "260px", padding: "8px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--xs-text-dim)" }}>
          <ShadowPanelIcon />
          <span style={{ fontSize: "15px", fontWeight: 700 }}>Shadow</span>
        </div>
        <div
          onClick={() => onChange({ shadow_enabled: !preset.shadow_enabled })}
          style={{
            width: "40px", height: "22px",
            backgroundColor: preset.shadow_enabled ? "#6366F1" : "rgba(255,255,255,0.1)",
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
          { id: "opacity", label: "Opacity", value: preset.shadow_opacity, min: 0, max: 1, step: 0.01, unit: "%", displayVal: Math.round(preset.shadow_opacity * 100), Icon: OpacityIcon },
          { id: "angle", label: "Angle", value: preset.shadow_angle, min: 0, max: 360, step: 1, unit: "°", displayVal: preset.shadow_angle, Icon: AngleIcon },
          { id: "blur", label: "Blur", value: preset.shadow_blur, min: 0, max: 100, step: 1, unit: "px", displayVal: preset.shadow_blur, Icon: BlurIcon },
          { id: "offset", label: "Offset", value: preset.shadow_offset, min: 0, max: 100, step: 1, unit: "px", displayVal: preset.shadow_offset, Icon: OffsetIcon }
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
              <item.Icon />
            </div>
            <span style={{ fontSize: "13px", color: "var(--xs-text-dim)", fontWeight: 600 }}>{item.label}</span>
            <div className="xs-slider-track-container" style={{ flex: 1 }}>
              <input
                type="range"
                min={item.min} max={item.max} step={item.step}
                className="xs-slider-input"
                value={item.value}
                onChange={(e) => onChange({ [`shadow_${item.id}`]: parseFloat(e.target.value) })}
                style={{ "--pct": `${((item.value - item.min) / (item.max - item.min)) * 100}%` } as React.CSSProperties}
              />
            </div>
            <span style={{
              fontSize: "12px", color: "var(--xs-accent)",
              fontWeight: 700,
              textAlign: "right", fontVariantNumeric: "tabular-nums",
              minWidth: "40px"
            }}>
              {item.displayVal}{item.unit}
            </span>
          </div>
        ))}
      </div>
    </div>

  );
}
