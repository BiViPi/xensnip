import { ShadowStyle } from "../../compose/preset";

interface Props {
  value: ShadowStyle;
  onChange: (value: ShadowStyle) => void;
}

const OPTIONS: ShadowStyle[] = ["None", "Small", "Medium", "Large"];

export function ShadowControl({ value, onChange }: Props) {
  return (
    <div className="control-popover">
      <div className="option-row">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`option-btn ${value === opt ? "active" : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
