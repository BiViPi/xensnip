import { useRef } from "react";
import "./Background.css";
import { EditorPreset, WALLPAPER_PRESETS, WALLPAPER_MAP, GRADIENT_PRESETS, SOLID_PRESETS, BackgroundMode, GradientType } from "../../compose/preset";

interface Props {
  preset: EditorPreset;
  onChange: (updates: Partial<EditorPreset>) => void;
}

function SelectedBadge() {
  return (
    <span className="xs-bg-choice-check" aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false">
        <path
          d="M4 8.25L6.5 10.75L12 5.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function describeArc(cx: number, cy: number, radius: number, progress: number) {
  if (progress <= 0) {
    return "";
  }

  const startAngle = -90;
  const endAngle = startAngle + Math.min(progress, 0.9999) * 360;
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = progress > 0.5 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function CompactCircularControl({
  type,
  angle,
  radius,
  onAngleChange,
  onRadiusChange,
}: {
  type: GradientType;
  angle: number;
  radius: number;
  onAngleChange: (value: number) => void;
  onRadiusChange: (value: number) => void;
}) {
  const dialRef = useRef<HTMLDivElement | null>(null);
  const normalizedRadius = (radius - 10) / 190;
  const knobAngle = type === "Linear" ? angle - 90 : normalizedRadius * 360 - 90;
  const knob = polarToCartesian(48, 48, 31, knobAngle);
  const arcProgress = type === "Linear" ? angle / 360 : normalizedRadius;
  const valueLabel = type === "Linear" ? `${angle}\u00B0` : `${radius}%`;
  const metaLabel = type === "Linear" ? "Angle" : "Radius";
  const helperLabel = type === "Linear" ? "Drag to rotate" : "Drag to resize";

  const updateFromPointer = (clientX: number, clientY: number) => {
    const node = dialRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const degrees = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;

    if (type === "Linear") {
      onAngleChange(degrees);
      return;
    }

    const nextRadius = Math.round(10 + (degrees / 360) * 190);
    onRadiusChange(Math.max(10, Math.min(200, nextRadius)));
  };

  return (
    <div className="xs-bg-dial-panel">
      <div
        ref={dialRef}
        className="xs-bg-dial"
        onPointerDown={(event) => {
          const target = event.currentTarget;
          target.setPointerCapture(event.pointerId);
          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1) return;
          updateFromPointer(event.clientX, event.clientY);
        }}
        role="slider"
        aria-label={metaLabel}
        aria-valuemin={type === "Linear" ? 0 : 10}
        aria-valuemax={type === "Linear" ? 360 : 200}
        aria-valuenow={type === "Linear" ? angle : radius}
        tabIndex={0}
        onKeyDown={(event) => {
          const step = type === "Linear" ? 15 : 10;
          const delta = event.key === "ArrowRight" || event.key === "ArrowUp" ? step : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -step : 0;
          if (!delta) return;
          event.preventDefault();
          if (type === "Linear") {
            onAngleChange((angle + delta + 360) % 360);
          } else {
            onRadiusChange(Math.max(10, Math.min(200, radius + delta)));
          }
        }}
      >
        <svg viewBox="0 0 96 96" className="xs-bg-dial-svg" aria-hidden="true">
          <defs>
            <linearGradient id="xs-bg-dial-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(34, 211, 238, 0.92)" />
              <stop offset="48%" stopColor="rgba(99, 102, 241, 1)" />
              <stop offset="100%" stopColor="rgba(129, 140, 248, 0.98)" />
            </linearGradient>
          </defs>
          <circle cx="48" cy="48" r="31" className="xs-bg-dial-track" />
          <path d={describeArc(48, 48, 31, arcProgress)} className="xs-bg-dial-progress" />
          <circle cx="48" cy="48" r="3" className="xs-bg-dial-center" />
          <circle cx={knob.x} cy={knob.y} r="6.5" className="xs-bg-dial-knob" />
        </svg>
      </div>

      <div className="xs-bg-dial-meta">
        <span className="xs-bg-dial-caption">{metaLabel}</span>
        <span className="xs-bg-dial-value">{valueLabel}</span>
      </div>
      <span className="xs-bg-dial-helper">{helperLabel}</span>
    </div>
  );
}

export function BackgroundControl({ preset, onChange }: Props) {
  const { bg_mode, bg_value, bg_colors, bg_gradient_type, bg_angle, bg_radius } = preset;
  const modeTabs: Array<{ mode: BackgroundMode; label: string }> = [
    { mode: "Gradient", label: "Gradient" },
    { mode: "Solid", label: "Solid" },
    { mode: "Wallpaper", label: "Image" },
  ];

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
      <div className="xs-bg-pop-header">
        <h3 className="xs-bg-pop-title">Background</h3>
      </div>

      <div className="xs-bg-mode-tabs" role="tablist" aria-label="Background mode">
        {modeTabs.map(({ mode, label }) => (
          <button
            key={mode}
            className={`xs-bg-mode-tab ${bg_mode === mode ? "active" : ""}`}
            onClick={() => setMode(mode)}
            role="tab"
            aria-selected={bg_mode === mode}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="xs-bg-content">
        <div className={`xs-bg-grid-compact ${bg_mode === "Wallpaper" ? "is-wallpaper" : ""}`}>
          {bg_mode === "Wallpaper" &&
            WALLPAPER_PRESETS.map((wp) => (
              <button
                key={wp.id}
                className={`xs-bg-choice ${bg_value === wp.id ? "active" : ""}`}
                style={{
                  backgroundImage: `url(${WALLPAPER_MAP[wp.id]})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                onClick={() => onChange({ bg_value: wp.id })}
                aria-label={wp.name}
                title={wp.name}
              >
                {bg_value === wp.id ? <SelectedBadge /> : null}
              </button>
            ))}

          {bg_mode === "Gradient" &&
            GRADIENT_PRESETS.map((colors, i) => {
              const isActive = JSON.stringify(bg_colors) === JSON.stringify(colors);
              return (
                <button
                  key={i}
                  className={`xs-bg-choice ${isActive ? "active" : ""}`}
                  style={{ background: `linear-gradient(135deg, ${colors.join(", ")})` }}
                  onClick={() => onChange({ bg_colors: colors })}
                  aria-label={`Gradient preset ${i + 1}`}
                >
                  {isActive ? <SelectedBadge /> : null}
                </button>
              );
            })}

          {bg_mode === "Solid" &&
            SOLID_PRESETS.map((color) => (
              <button
                key={color}
                className={`xs-bg-choice solid ${bg_value === color ? "active" : ""}`}
                style={{ background: color }}
                onClick={() => onChange({ bg_value: color })}
                aria-label={color}
                title={color}
              >
                {bg_value === color ? <SelectedBadge /> : null}
              </button>
            ))}
        </div>

        {bg_mode === "Gradient" && (
          <div className="xs-bg-controls-compact">
            <div className="xs-bg-gradient-layout">
              <div className="xs-bg-type-stack">
              {(["Linear", "Radial"] as GradientType[]).map((t) => (
                <button
                  key={t}
                  className={`xs-bg-type-tab ${bg_gradient_type === t ? "active" : ""}`}
                  onClick={() => onChange({ bg_gradient_type: t })}
                >
                  {t}
                </button>
              ))}
              </div>

              <CompactCircularControl
                type={bg_gradient_type}
                angle={bg_angle}
                radius={bg_radius}
                onAngleChange={(value) => onChange({ bg_angle: value })}
                onRadiusChange={(value) => onChange({ bg_radius: value })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
