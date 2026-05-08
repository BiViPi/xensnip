import { useState, useRef, useEffect } from "react";
import "./Presets.css";
import { EditorPreset } from "../../compose/preset";
import { SavedPreset, Settings } from "../../ipc/types";
import { 
  presetSave, 
  presetDelete, 
  presetRename, 
  presetDuplicate, 
  presetSetDefault, 
  presetExportPack, 
  presetImport 
} from "../../ipc/index";

interface Props {
  preset: EditorPreset;
  settings: Settings | null;
  onApply: (p: EditorPreset) => void;
  onRefresh: () => void;
  showToast: (m: string, t?: "success" | "error") => void;
  onOpenManager: () => void;
}

export function PresetsControl({ preset, settings, onApply, onRefresh, showToast, onOpenManager }: Props) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const savedPresets = settings?.saved_presets || [];
  const defaultPresetId = settings?.default_preset_id;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        id: existingPreset?.id ?? crypto.randomUUID(),
        name: trimmedName,
        preset: JSON.parse(JSON.stringify(preset)),
        updated_at: new Date().toISOString()
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

  const handleRename = async (id: string, currentName: string) => {
    const newName = window.prompt("Rename preset to:", currentName);
    if (newName && newName.trim() !== currentName) {
      try {
        await presetRename(id, newName.trim());
        onRefresh();
        showToast("Preset renamed", "success");
      } catch (err) {
        showToast("Failed to rename preset", "error");
      }
    }
    setActiveMenuId(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await presetDuplicate(id);
      onRefresh();
      showToast("Preset duplicated", "success");
    } catch (err) {
      showToast("Failed to duplicate preset", "error");
    }
    setActiveMenuId(null);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await presetSetDefault(id === defaultPresetId ? null : id);
      onRefresh();
      showToast(id === defaultPresetId ? "Default cleared" : "Default preset set", "success");
    } catch (err) {
      showToast("Failed to set default", "error");
    }
    setActiveMenuId(null);
  };

  const handleExportSingle = async (id: string) => {
    try {
      const success = await presetExportPack([id]);
      if (success) showToast("Preset exported", "success");
    } catch (err) {
      showToast("Failed to export preset", "error");
    }
    setActiveMenuId(null);
  };

  const handleExportAll = async () => {
    try {
      const ids = savedPresets.map(p => p.id);
      if (ids.length === 0) return;
      const success = await presetExportPack(ids);
      if (success) showToast("Preset pack exported", "success");
    } catch (err) {
      showToast("Export failed", "error");
    }
  };

  const handleImport = async () => {
    try {
      const result = await presetImport();
      if (result.imported > 0) {
        onRefresh();
        const msg = result.skipped > 0 
          ? `Imported ${result.imported} presets (${result.skipped} skipped)`
          : `Imported ${result.imported} preset(s)`;
        showToast(msg, "success");
      } else if (result.skipped > 0) {
        showToast(`Skipped ${result.skipped} invalid entries`, "error");
      }
    } catch (err) {
      showToast(typeof err === 'string' ? err : "Import failed", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this preset?")) return;
    try {
      await presetDelete(id);
      onRefresh();
      showToast("Preset deleted", "success");
    } catch (err) {
      showToast("Failed to delete preset", "error");
    }
    setActiveMenuId(null);
  };

  return (
    <div className="xs-preset-popover" ref={popoverRef}>
      <div className="xs-preset-header">
        <div className="xs-preset-title">Presets</div>
        <div className="xs-preset-subtitle">Save and reuse your custom styles</div>
      </div>
      
      {/* Save Area */}
      <div className="xs-preset-save-area">
        <input 
          type="text"
          placeholder="Preset name..."
          value={name}
          onChange={e => setName(e.target.value)}
          className="xs-preset-input"
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <button 
          className="xs-preset-save-btn"
          onClick={handleSave}
          disabled={isSaving}
        >
          Save
        </button>
      </div>

      {/* List Area */}
      <div className="xs-preset-list">
        {savedPresets.length === 0 ? (
          <div className="xs-preset-empty">
            No presets saved yet
          </div>
        ) : (
          savedPresets.map(p => (
            <div key={p.id} className={`xs-preset-row ${defaultPresetId === p.id ? 'is-default' : ''}`}>
              <div className="xs-preset-info">
                <div className="xs-preset-name-wrap">
                  <span className="xs-preset-name">{p.name}</span>
                  {defaultPresetId === p.id && <span className="xs-badge-default">Default</span>}
                </div>
                <div className="xs-preset-tags">
                  <span className="xs-tag">{p.preset.ratio}</span>
                  <span className="xs-tag">{p.preset.bg_mode}</span>
                  <span className="xs-tag">P:{p.preset.padding}</span>
                </div>
              </div>
              
              <div className="xs-preset-actions">
                <button className="xs-btn-apply" onClick={() => onApply(p.preset)}>Apply</button>
                <div className="xs-more-wrap">
                  <button className="xs-btn-more" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const popRect = popoverRef.current?.getBoundingClientRect();
                    if (popRect) {
                      setMenuTop(rect.top - popRect.top);
                    }
                    setActiveMenuId(activeMenuId === p.id ? null : p.id);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-out Menu (Rendered outside list to avoid clipping) */}
      {activeMenuId && (
        <div 
          className="xs-more-menu" 
          ref={menuRef} 
          style={{ top: `${menuTop}px` }}
        >
          {(() => {
            const p = savedPresets.find(x => x.id === activeMenuId);
            if (!p) return null;
            return (
              <>
                <button onClick={() => handleRename(p.id, p.name)}>Rename</button>
                <button onClick={() => handleDuplicate(p.id)}>Duplicate</button>
                <button onClick={() => handleSetDefault(p.id)}>{defaultPresetId === p.id ? 'Unset Default' : 'Set as Default'}</button>
                <button onClick={() => handleExportSingle(p.id)}>Export</button>
                <div className="xs-menu-divider" />
                <button className="xs-menu-danger" onClick={() => handleDelete(p.id)}>Delete</button>
              </>
            );
          })()}
        </div>
      )}

      {/* Footer */}
      <div className="xs-preset-footer">
        <button className="xs-preset-link" onClick={onOpenManager}>Manage presets</button>
        <div className="xs-footer-group">
          <button className="xs-preset-link" onClick={handleImport}>Import</button>
          <button className="xs-preset-link" onClick={handleExportAll} disabled={savedPresets.length === 0}>Export All</button>
        </div>
      </div>
    </div>
  );
}
