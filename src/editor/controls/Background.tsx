import { EditorPreset, WALLPAPER_PRESETS, WALLPAPER_MAP, GRADIENT_PRESETS, SOLID_PRESETS, BackgroundMode, GradientType } from "../../compose/preset";

interface Props {
  preset: EditorPreset;
  onChange: (updates: Partial<EditorPreset>) => void;
}

function BackgroundModeIcon({ mode }: { mode: BackgroundMode }) {
  if (mode === "Wallpaper") {
    return (
      <svg className="xs-tab-icon" viewBox="0 0 1024 1024" aria-hidden="true">
        <defs>
          <linearGradient id="wallpaper-tab-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--icon-accent-blue-light)" />
            <stop offset="100%" stopColor="var(--icon-accent-blue)" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#wallpaper-tab-grad)" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round">
          <rect x="232" y="232" width="560" height="560" rx="120" />
          <circle cx="370" cy="380" r="50" />
          <path d="M232 700L410 520L510 640L660 450L792 600" />
        </g>
      </svg>
    );
  }

  if (mode === "Gradient") {
    return (
      <svg className="xs-tab-icon" viewBox="0 0 1024 1024" aria-hidden="true">
        <defs>
          <linearGradient id="gradient-tab-fill" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="gradient-tab-stroke" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect x="232" y="232" width="560" height="560" rx="120" fill="url(#gradient-tab-fill)" stroke="url(#gradient-tab-stroke)" strokeWidth="32" />
      </svg>
    );
  }

  return (
    <svg className="xs-tab-icon" viewBox="0 0 1024 1024" aria-hidden="true">
      <defs>
        <linearGradient id="solid-tab-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--icon-accent-blue-light)" />
          <stop offset="100%" stopColor="var(--icon-accent-blue)" />
        </linearGradient>
      </defs>
      <rect x="232" y="232" width="560" height="560" rx="120" fill="none" stroke="url(#solid-tab-grad)" strokeWidth="48" />
      <rect x="296" y="296" width="432" height="432" rx="64" fill="url(#solid-tab-grad)" />
    </svg>
  );
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
    <div className="xs-bg-pop v2">
      <div className="xs-bg-sidebar">
        <div className="xs-tabs vertical">
          {(["Wallpaper", "Gradient", "Solid"] as BackgroundMode[]).map((m) => (
            <button
              key={m}
              className={`xs-tab-item ${bg_mode === m ? "active" : ""}`}
              onClick={() => setMode(m)}
              aria-label={m}
              title={m}
            >
              <div className="xs-tab-accent" />
              <BackgroundModeIcon mode={m} />
            </button>
          ))}
        </div>
      </div>

      <div className="xs-bg-main">

        <div className="xs-bg-content">
          <div className="xs-bg-grid v-rect">
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

          {/* Gradient-only controls */}
          {bg_mode === "Gradient" && (
            <div className="xs-bg-controls-compact">
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
      </div>
    </div>
  );
}
