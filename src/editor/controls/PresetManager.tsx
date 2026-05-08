import { useEffect, useState } from "react";
import "./PresetManager.css";
import { Settings } from "../../ipc/types";
import {
  presetDelete,
  presetDuplicate,
  presetExportPack,
  presetRename,
  presetReorder,
  presetSetDefault,
} from "../../ipc/index";

interface Props {
  settings: Settings | null;
  onRefresh: () => void;
  onClose: () => void;
  showToast: (m: string, t?: "success" | "error") => void;
}

export function PresetManager({ settings, onRefresh, onClose, showToast }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const presets = settings?.saved_presets || [];
  const defaultId = settings?.default_preset_id;
  const areAllSelected = presets.length > 0 && selectedIds.length === presets.length;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => presets.some((preset) => preset.id === id)));
    if (editingId && !presets.some((preset) => preset.id === editingId)) {
      setEditingId(null);
      setEditValue("");
    }
  }, [editingId, presets]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected preset(s)?`)) return;
    try {
      for (const id of selectedIds) {
        await presetDelete(id);
      }
      setSelectedIds([]);
      onRefresh();
      showToast("Presets deleted", "success");
    } catch {
      showToast("Failed to delete some presets", "error");
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.length === 0) return;
    try {
      const success = await presetExportPack(selectedIds);
      if (success) showToast("Presets exported", "success");
    } catch {
      showToast("Export failed", "error");
    }
  };

  const handleRenameCommit = async (id: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await presetRename(id, editValue.trim());
      setEditingId(null);
      setEditValue("");
      onRefresh();
      showToast("Preset renamed", "success");
    } catch {
      showToast("Rename failed", "error");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await presetDuplicate(id);
      onRefresh();
      showToast("Preset duplicated", "success");
    } catch {
      showToast("Duplicate failed", "error");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await presetSetDefault(id === defaultId ? null : id);
      onRefresh();
      showToast(id === defaultId ? "Default cleared" : "Default preset set", "success");
    } catch {
      showToast("Failed to update default preset", "error");
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (!window.confirm("Delete this preset?")) return;
    try {
      await presetDelete(id);
      onRefresh();
      showToast("Preset deleted", "success");
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const moveItem = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= presets.length) return;
    const newList = [...presets];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, moved);

    try {
      await presetReorder(newList.map((preset) => preset.id));
      onRefresh();
    } catch {
      showToast("Reorder failed", "error");
    }
  };

  return (
    <div className="xs-modal-overlay" onClick={onClose}>
      <div className="xs-modal-content xs-preset-manager" onClick={(e) => e.stopPropagation()}>
        <div className="xs-modal-header">
          <div className="xs-modal-title">Manage Presets</div>
          <button className="xs-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="xs-manager-toolbar">
          <div className="xs-toolbar-left">
            <button
              className="xs-btn-text"
              onClick={() => setSelectedIds(areAllSelected ? [] : presets.map((preset) => preset.id))}
            >
              {areAllSelected ? "Deselect All" : "Select All"}
            </button>
            {selectedIds.length > 0 && (
              <span className="xs-selection-count">{selectedIds.length} selected</span>
            )}
          </div>
          <div className="xs-toolbar-right">
            <button className="xs-btn-danger" disabled={selectedIds.length === 0} onClick={handleBulkDelete}>Delete Selected</button>
            <button className="xs-btn-ghost" disabled={selectedIds.length === 0} onClick={handleBulkExport}>Export Selected</button>
          </div>
        </div>

        <div className="xs-manager-list">
          {presets.length === 0 ? (
            <div className="xs-preset-empty">No presets found. Save some from the toolbar first!</div>
          ) : (
            presets.map((preset, idx) => (
              <div key={preset.id} className={`xs-manager-row ${selectedIds.includes(preset.id) ? "selected" : ""}`}>
                <div className="xs-row-main">
                  <div className="xs-check-wrap" onClick={() => toggleSelect(preset.id)}>
                    <div className={`xs-checkbox ${selectedIds.includes(preset.id) ? "checked" : ""}`} />
                  </div>

                  <div className="xs-reorder-btns">
                    <button onClick={() => moveItem(idx, idx - 1)} disabled={idx === 0}>^</button>
                    <button onClick={() => moveItem(idx, idx + 1)} disabled={idx === presets.length - 1}>v</button>
                  </div>

                  <div className="xs-row-info">
                    {editingId === preset.id ? (
                      <input
                        autoFocus
                        className="xs-inline-edit"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => void handleRenameCommit(preset.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void handleRenameCommit(preset.id);
                          }
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditValue("");
                          }
                        }}
                      />
                    ) : (
                      <div className="xs-name-row" onDoubleClick={() => { setEditingId(preset.id); setEditValue(preset.name); }}>
                        <span className="xs-manager-name">{preset.name}</span>
                        {defaultId === preset.id && <span className="xs-badge-default">Default</span>}
                      </div>
                    )}
                    <div className="xs-manager-meta">
                      {preset.preset.ratio} | {preset.preset.bg_mode} | Padding: {preset.preset.padding} | Radius: {preset.preset.radius}
                    </div>
                  </div>
                </div>

                <div className="xs-row-actions">
                  <button className="xs-row-btn" onClick={() => { setEditingId(preset.id); setEditValue(preset.name); }}>Rename</button>
                  <button className="xs-row-btn" onClick={() => void handleDuplicate(preset.id)}>Duplicate</button>
                  <button className={`xs-row-btn ${defaultId === preset.id ? "active" : ""}`} onClick={() => void handleSetDefault(preset.id)}>
                    {defaultId === preset.id ? "Default" : "Set Default"}
                  </button>
                  <button className="xs-row-btn xs-btn-danger-text" onClick={() => void handleDeleteOne(preset.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
