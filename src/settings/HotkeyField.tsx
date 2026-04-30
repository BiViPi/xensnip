import { useState, useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function HotkeyField({ value, onChange, error }: Props) {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!isListening) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setIsListening(false);
        return;
      }

      // Ignore modifier-only presses
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        return;
      }

      const parts = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      if (e.metaKey) parts.push("Command");

      let key = e.key.toUpperCase();
      if (key === " ") key = "SPACE";
      if (key === "ARROWUP") key = "UP";
      if (key === "ARROWDOWN") key = "DOWN";
      if (key === "ARROWLEFT") key = "LEFT";
      if (key === "ARROWRIGHT") key = "RIGHT";
      
      parts.push(key);
      const combo = parts.join("+");
      
      onChange(combo);
      setIsListening(false);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isListening, onChange]);

  return (
    <div className={`hotkey-field-container ${error ? "has-error" : ""}`}>
      <div 
        className={`hotkey-field ${isListening ? "listening" : ""}`}
        onClick={() => setIsListening(true)}
        tabIndex={0}
      >
        {isListening ? "Press keys..." : value}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
