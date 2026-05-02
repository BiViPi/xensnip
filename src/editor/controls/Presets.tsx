import { useState } from "react";
import { EditorPreset } from "../../compose/preset";
import { SavedPreset } from "../../ipc/types";
import { presetSave, presetDelete } from "../../ipc/index";

interface Props {
  preset: EditorPreset;
  savedPresets: SavedPreset[];
  onApply: (p: EditorPreset) => void;
  onRefresh: () => void;
  showToast: (m: string, t?: "success" | "error") => void;
}

export function PresetsControl({ preset, savedPresets, onApply, onRefresh, showToast }: Props) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      showToast("Please enter a name", "error");
      return;
    }

    const existingPreset = savedPresets.find((p) => p.name === trimmedName);
    if (existingPreset && !window.confirm(`Overwrite preset "${trimmedName}"?`)) {
      return;
    }
    
    setIsSaving(true);
    try {
      const newSaved: SavedPreset = {
        id: existingPreset?.id ?? Math.random().toString(36).substring(2, 9),
        name: trimmedName,
        preset: JSON.parse(JSON.stringify(preset)) // Deep clone
      };
      await presetSave(newSaved);
      setName("");
      onRefresh();
      showToast("Preset saved", "success");
    } catch (err) {
      showToast("Failed to save preset", "error");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await presetDelete(id);
      onRefresh();
      showToast("Preset deleted", "success");
    } catch (err) {
      showToast("Failed to delete preset", "error");
      console.error(err);
    }
  };

  return (
    <div style={{ width: "260px", padding: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ color: "var(--xs-text-dim)", fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>Presets</div>
      
      {/* Save Area */}
      <div style={{ display: "flex", gap: "8px" }}>
        <input 
          type="text"
          placeholder="Preset name..."
          value={name}
          onChange={e => setName(e.target.value)}
          className="xs-preset-input"
          style={{
            flex: 1,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            padding: "6px 10px",
            color: "#fff",
            fontSize: "13px",
            outline: "none"
          }}
        />
        <button 
          onClick={handleSave}
          disabled={isSaving}
          style={{
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "0 12px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            opacity: isSaving ? 0.6 : 1
          }}
        >
          Save
        </button>
      </div>

      {/* List Area */}
      <div style={{ 
        maxHeight: "200px", 
        overflowY: "auto", 
        display: "flex", 
        flexDirection: "column", 
        gap: "4px",
        paddingRight: "4px"
      }}>
        {savedPresets.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", textAlign: "center", padding: "20px 0" }}>
            No presets saved yet
          </div>
        ) : (
          savedPresets.map(p => (
            <div key={p.id} className="xs-preset-item" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.03)",
              transition: "background 0.2s"
            }}>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "12px" }}>
                {p.name}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button 
                  onClick={() => onApply(p.preset)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  Apply
                </button>
                <button 
                  onClick={() => handleDelete(p.id)}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#f87171",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
