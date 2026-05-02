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
    <div className={`xs-hotkey-container ${error ? "has-error" : ""}`}>
      <div 
        className={`xs-hotkey-input ${isListening ? "listening" : ""}`}
        onClick={() => setIsListening(true)}
        tabIndex={0}
      >
        {isListening ? (
          <span className="xs-hotkey-listening">Recording...</span>
        ) : (
          <span className="xs-hotkey-value">{value}</span>
        )}
      </div>
      {error && <div className="xs-field-error">{error}</div>}

      <style>{`
        .xs-hotkey-container {
          position: relative;
          min-width: 120px;
        }

        .xs-hotkey-input {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
          font-size: 11px;
          outline: none;
        }

        .xs-hotkey-input:hover {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(0, 0, 0, 0.4);
        }

        .xs-hotkey-input.listening {
          border-color: #3b82f6;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
          background: rgba(59, 130, 246, 0.1);
        }

        .xs-hotkey-value {
          color: #3b82f6;
          font-weight: 700;
        }

        .xs-hotkey-listening {
          color: #94a3b8;
          font-style: italic;
          animation: pulse 1.5s infinite;
        }

        .xs-field-error {
          color: #ef4444;
          font-size: 11px;
          margin-top: 4px;
          position: absolute;
          right: 0;
        }

        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
