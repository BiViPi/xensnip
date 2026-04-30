import { BACKGROUND_CONFIGS, BackgroundStyle, EditorPreset } from "../../compose/preset";

interface Props {
  value: BackgroundStyle;
  onChange: (value: BackgroundStyle) => void;
}

export function BackgroundControl({ value, onChange }: Props) {
  return (
    <div className="control-popover">
      <div className="swatch-row">
        {(Object.keys(BACKGROUND_CONFIGS) as BackgroundStyle[]).map((style) => (
          <button
            key={style}
            className={`swatch ${value === style ? "active" : ""}`}
            onClick={() => onChange(style)}
            title={style}
            style={{
              background: Array.isArray(BACKGROUND_CONFIGS[style])
                ? `linear-gradient(45deg, ${(BACKGROUND_CONFIGS[style] as string[]).join(", ")})`
                : (BACKGROUND_CONFIGS[style] as string),
            }}
          />
        ))}
      </div>
    </div>
  );
}
