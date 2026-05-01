import { useEffect, useRef, useState } from "react";
import { settingsLoad, settingsSave } from "../ipc/index";
import { Settings as SettingsType, SettingsSaveError } from "../ipc/types";
import { Toast } from "../editor/Toast";
import { HotkeyField } from "./HotkeyField";
import { TitleBar } from "../editor/TitleBar";
import "./Settings.css";

export function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [draft, setDraft] = useState<SettingsType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  useEffect(() => {
    let isMounted = true;
    void settingsLoad()
      .then((nextSettings) => {
        if (!isMounted) return;
        setSettings(nextSettings);
        setDraft(nextSettings);
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load settings", err);
        if (!isMounted) return;
        setLoadError("Failed to load settings.");
      });
    return () => {
      isMounted = false;
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    setErrors({});
    try {
      const result = await settingsSave(draft);
      setSettings(draft);
      if (result.warnings.length > 0) {
        showToast(`Saved with warnings.`, "error");
      } else {
        showToast("Settings saved.");
      }
    } catch (err: unknown) {
      const saveError = err as SettingsSaveError;
      if (saveError && saveError.code === "InvalidHotkey") {
        setErrors({ [saveError.data.field]: `Invalid: ${saveError.data.value}` });
      } else {
        showToast("Failed to save.", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(settings);
    setErrors({});
  };

  if (loadError) return <div className="settings-loading">{loadError}</div>;
  if (!draft) return <div className="settings-loading">Loading...</div>;

  return (
    <div className="xs-settings-shell" data-tauri-drag-region>
      <TitleBar title="Settings" />
      
      <header className="xs-settings-header">
        <h1>XenSnip</h1>
      </header>

      <main className="xs-settings-content">
        <section className="xs-settings-section">
          <h3>General</h3>
          <div className="xs-settings-row">
            <div className="xs-field-label">
              <span className="xs-label-text">Startup</span>
              <span className="xs-label-desc">Launch XenSnip on system startup</span>
            </div>
            <label className="xs-switch">
              <input
                type="checkbox"
                checked={draft.launch_at_startup}
                onChange={(e) => setDraft({ ...draft, launch_at_startup: e.target.checked })}
              />
              <span className="xs-slider"></span>
            </label>
          </div>
        </section>

        <section className="xs-settings-section">
          <h3>Hotkeys</h3>
          <div className="xs-settings-row">
            <div className="xs-field-label">
              <span className="xs-label-text">Region Capture</span>
              <span className="xs-label-desc">Draw a box to capture</span>
            </div>
            <HotkeyField
              value={draft.hotkeys.region}
              onChange={(value) => setDraft({ ...draft, hotkeys: { ...draft.hotkeys, region: value } })}
              error={errors.region}
            />
          </div>

          <div className="xs-settings-row">
            <div className="xs-field-label">
              <span className="xs-label-text">Window Capture</span>
              <span className="xs-label-desc">Capture active window</span>
            </div>
            <HotkeyField
              value={draft.hotkeys.active_window}
              onChange={(value) => setDraft({ ...draft, hotkeys: { ...draft.hotkeys, active_window: value } })}
              error={errors.active_window}
            />
          </div>
        </section>
      </main>

      <footer className="xs-settings-footer">
        <button className="xs-btn xs-action-secondary" onClick={handleCancel} disabled={isSaving}>Cancel</button>
        <button className="xs-btn xs-action-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </footer>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
