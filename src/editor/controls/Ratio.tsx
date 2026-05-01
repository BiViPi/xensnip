import { RatioOption } from "../../compose/preset";

interface Props {
  value: RatioOption;
  onChange: (value: RatioOption) => void;
}

const OPTIONS: RatioOption[] = ["Free", "16:9", "4:3", "1:1", "3:4", "9:16"];

export function RatioControl({ value, onChange }: Props) {
  return (
    <div className="xs-ratio-container">
      <div className="xs-ratio-grid">
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
