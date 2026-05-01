import { EditorPreset, WALLPAPER_PRESETS, WALLPAPER_MAP, GRADIENT_PRESETS, SOLID_PRESETS, BackgroundMode, GradientType } from "../../compose/preset";

interface Props {
  preset: EditorPreset;
  onChange: (updates: Partial<EditorPreset>) => void;
}

export function BackgroundControl({ preset, onChange }: Props) {
  const { bg_mode, bg_value, bg_colors, bg_gradient_type, bg_angle, bg_radius } = preset;

  const setMode = (mode: BackgroundMode) => {
    if (mode === "Wallpaper") {
      onChange({ bg_mode: mode, bg_value: WALLPAPER_PRESETS[0].id });
    } else if (mode === "Gradient") {
      onChange({ bg_mode: mode, bg_colors: GRADIENT_PRESETS[0], bg_gradient_type: "Linear" });
    } else {
      onChange({ bg_mode: mode, bg_value: SOLID_PRESETS[0] });
    }
  };

  return (
    <div className="xs-bg-pop">
      {/* 1. Segmented Tabs */}
      <div className="xs-tabs">
        {(["Wallpaper", "Gradient", "Solid"] as BackgroundMode[]).map((m) => (
          <button
            key={m}
            className={`xs-tab-item ${bg_mode === m ? "active" : ""}`}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 2. Preset Grid (Fixed 4 columns) */}
      <div className="xs-bg-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {bg_mode === "Wallpaper" && WALLPAPER_PRESETS.map((wp) => (
          <button
            key={wp.id}
            className={`xs-bg-tile ${bg_value === wp.id ? "active" : ""}`}
            style={{ 
              backgroundImage: `url(${WALLPAPER_MAP[wp.id]})`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
            onClick={() => onChange({ bg_value: wp.id })}
          />
        ))}

        {bg_mode === "Gradient" && GRADIENT_PRESETS.map((colors, i) => (
          <button
            key={i}
            className={`xs-bg-tile ${JSON.stringify(bg_colors) === JSON.stringify(colors) ? "active" : ""}`}
            style={{ background: `linear-gradient(45deg, ${colors.join(", ")})` }}
            onClick={() => onChange({ bg_colors: colors })}
          />
        ))}

        {bg_mode === "Solid" && SOLID_PRESETS.map((color) => (
          <button
            key={color}
            className={`xs-bg-tile solid ${bg_value === color ? "active" : ""}`}
            style={{ background: color }}
            onClick={() => onChange({ bg_value: color })}
          />
        ))}
      </div>

      {/* 3. Gradient Controls */}
      {bg_mode === "Gradient" && (
        <div className="xs-bg-controls">
          <div className="xs-sub-toggle">
            {(["Linear", "Radial"] as GradientType[]).map((t) => (
              <button
                key={t}
                className={`xs-sub-item ${bg_gradient_type === t ? "active" : ""}`}
                onClick={() => onChange({ bg_gradient_type: t })}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="xs-slider-group">
            {bg_gradient_type === "Linear" ? (
              <div className="xs-slider-mini">
                <div className="xs-slider-header">
                  <span className="xs-slider-label">Angle</span>
                  <span className="xs-slider-val">{bg_angle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={bg_angle}
                  onChange={(e) => onChange({ bg_angle: parseInt(e.target.value) })}
                  className="xs-slider-input"
                  style={{ "--pct": `${(bg_angle / 360) * 100}%` } as any}
                />
              </div>
            ) : (
              <div className="xs-slider-mini">
                <div className="xs-slider-header">
                  <span className="xs-slider-label">Radius</span>
                  <span className="xs-slider-val">{bg_radius}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  value={bg_radius}
                  onChange={(e) => onChange({ bg_radius: parseInt(e.target.value) })}
                  className="xs-slider-input"
                  style={{ "--pct": `${((bg_radius - 10) / 190) * 100}%` } as any}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
