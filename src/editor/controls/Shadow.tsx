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
        <label className="xs-switch">
          <input
            type="checkbox"
            checked={preset.shadow_enabled}
            onChange={() => onChange({ shadow_enabled: !preset.shadow_enabled })}
          />
          <span className="xs-slider"></span>
        </label>
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
        ].map((item) => {
          const pct = ((item.value - item.min) / (item.max - item.min)) * 100;
          const ratio = pct / 100;
          const fillWidth = `calc(${pct}% + ${(9 - 18 * ratio).toFixed(2)}px)`;

          return (
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
              <div
                className="xs-slider-track-container"
                style={
                  {
                    flex: 1,
                    "--pct": `${pct}%`,
                    "--fill-width": fillWidth,
                  } as React.CSSProperties
                }
              >
                <input
                  type="range"
                  min={item.min} max={item.max} step={item.step}
                  className="xs-slider-input"
                  value={item.value}
                  onChange={(e) => onChange({ [`shadow_${item.id}`]: parseFloat(e.target.value) })}
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
          );
        })}
      </div>
    </div>

  );
}
