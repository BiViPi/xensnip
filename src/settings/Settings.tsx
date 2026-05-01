import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { settingsLoad, settingsSave } from "../ipc/index";
import { Settings as SettingsType, SettingsSaveError } from "../ipc/types";
import { Toast } from "../editor/Toast";
import { HotkeyField } from "./HotkeyField";
import { TitleBar } from "../editor/TitleBar";
import "./Settings.css";

export function Settings() {
  const appWindow = getCurrentWindow();
  const [draft, setDraft] = useState<SettingsType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const loadedRef = useRef<SettingsType | null>(null);

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
        loadedRef.current = nextSettings;
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

    // HOTKEY-03 Track 1: block save on duplicate binding
    if (draft.hotkeys.region === draft.hotkeys.active_window) {
      setErrors({ active_window: "This shortcut is already used for Region Capture" });
      return;
    }

    setIsSaving(true);
    setErrors({});
    try {
      const result = await settingsSave(draft);
      if (result.warnings.length > 0) {
        for (const w of result.warnings) {
          showToast(
            `Saved. Shortcut '${w.shortcut}' could not be activated — it may be claimed by another app.`,
            "error"
          );
        }
      } else {
        showToast("Settings saved successfully.");
      }
    } catch (err: unknown) {
      const saveError = err as SettingsSaveError;
      if (saveError && saveError.code === "InvalidHotkey") {
        setErrors({ [saveError.data.field]: `Invalid: ${saveError.data.value}` });
        showToast("Invalid hotkey configuration.", "error");
      } else {
        showToast("Failed to save settings.", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    void appWindow.close();
  };

  if (loadError) return <div className="settings-loading">{loadError}</div>;
  if (!draft) return <div className="settings-loading">Loading...</div>;

  return (
    <div className="xs-settings-shell">
      <TitleBar title="Settings" showMaximize={false} />
      
      <div className="xs-settings-glow" />

      <main className="xs-settings-content">
        <header className="xs-settings-content-header">
          <h2>Preferences</h2>
          <p>Configure how XenSnip behaves on your system.</p>
        </header>

        <section className="xs-settings-section">
          <div className="xs-section-title">General</div>
          <div className="xs-card">
            <div className="xs-settings-row">
              <div className="xs-field-label">
                <span className="xs-label-text">Launch on Startup</span>
                <span className="xs-label-desc">Automatically start XenSnip when you log in</span>
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
          </div>
        </section>

        <section className="xs-settings-section">
          <div className="xs-section-title">Global Hotkeys</div>
          <div className="xs-card">
            <div className="xs-settings-row">
              <div className="xs-field-label">
                <span className="xs-label-text">Region Capture</span>
                <span className="xs-label-desc">Select a custom area to capture</span>
              </div>
              <HotkeyField
                value={draft.hotkeys.region}
                onChange={(value) => setDraft({ ...draft, hotkeys: { ...draft.hotkeys, region: value } })}
                error={errors.region}
              />
            </div>
            
            <div className="xs-divider" />

            <div className="xs-settings-row">
              <div className="xs-field-label">
                <span className="xs-label-text">Window Capture</span>
                <span className="xs-label-desc">Capture the currently active window</span>
              </div>
              <HotkeyField
                value={draft.hotkeys.active_window}
                onChange={(value) => {
                  setDraft({ ...draft, hotkeys: { ...draft.hotkeys, active_window: value } });
                  if (errors.active_window) setErrors((prev) => { const n = { ...prev }; delete n.active_window; return n; });
                }}
                error={errors.active_window}
              />
            </div>
          </div>
        </section>

        <div className="xs-settings-spacer" />
      </main>

      <footer className="xs-settings-footer">
        <button className="xs-settings-btn-secondary" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </button>
        <button className="xs-settings-btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </footer>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
