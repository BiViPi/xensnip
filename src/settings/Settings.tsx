import { useEffect, useRef, useState } from "react";
import { settingsLoad, settingsSave } from "../ipc/index";
import { Settings as SettingsType, SettingsSaveError } from "../ipc/types";
import { Toast } from "../editor/Toast";
import { HotkeyField } from "./HotkeyField";
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
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
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
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
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
        const message = result.warnings
          .map(
            (warning) =>
              `Saved. Shortcut '${warning.shortcut}' could not be activated; it may be claimed by another app.`,
          )
          .join(" ");
        showToast(message, "error");
      } else {
        showToast("Settings saved.");
      }
    } catch (err: unknown) {
      console.error("Save failed", err);
      const saveError = err as SettingsSaveError;
      if (saveError && saveError.code === "InvalidHotkey") {
        setErrors({ [saveError.data.field]: `Invalid shortcut: ${saveError.data.value}` });
      } else {
        showToast("Failed to save settings.", "error");
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
    <div className="settings-window">
      <header className="settings-header">
        <h1>XenSnip Settings</h1>
      </header>

      <main className="settings-content">
        <section className="settings-section">
          <h3>Hotkeys</h3>
          <div className="settings-row">
            <div className="field-label">
              <span className="label-text">Region Capture</span>
              <span className="label-desc">Capture a custom rectangular area</span>
            </div>
            <HotkeyField
              value={draft.hotkeys.region}
              onChange={(value) => setDraft({ ...draft, hotkeys: { ...draft.hotkeys, region: value } })}
              error={errors.region}
            />
          </div>

          <div className="settings-row">
            <div className="field-label">
              <span className="label-text">Window Capture</span>
              <span className="label-desc">Capture the currently active window</span>
            </div>
            <HotkeyField
              value={draft.hotkeys.active_window}
              onChange={(value) =>
                setDraft({ ...draft, hotkeys: { ...draft.hotkeys, active_window: value } })
              }
              error={errors.active_window}
            />
          </div>
        </section>

        <section className="settings-section">
          <h3>Startup</h3>
          <div className="settings-row checkbox-row">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={draft.launch_at_startup}
                onChange={(e) => setDraft({ ...draft, launch_at_startup: e.target.checked })}
              />
              <span className="checkbox-label">Launch XenSnip on system startup</span>
            </label>
          </div>
        </section>
      </main>

      <footer className="settings-actions">
        <button className="settings-btn secondary" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </button>
        <button className="settings-btn primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </footer>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
