import { ShadowStyle } from "../../compose/preset";

interface Props {
  value: ShadowStyle;
  onChange: (value: ShadowStyle) => void;
}

const OPTIONS: ShadowStyle[] = ["None", "Small", "Medium", "Large"];

export function ShadowControl({ value, onChange }: Props) {
  return (
    <div className="xs-ratio-container">
      <div className="xs-ratio-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", minWidth: "200px" }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`xs-ratio-item ${value === opt ? "active" : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
