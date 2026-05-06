import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { settingsLoad, settingsSave, selectExportFolder } from "../ipc/index";
import { Settings as SettingsType, SettingsSaveError, ThemeMode } from "../ipc/types";
import { applyTheme } from "../styles/applyTheme";
import { emit, listen } from "@tauri-apps/api/event";
import { Toast } from "../editor/Toast";
import { HotkeyField } from "./HotkeyField";
import { TitleBar } from "../editor/TitleBar";
import "./Settings.css";

import {
  LaunchOnStartupIcon, IconSoundIcon, ExportSoundIcon, SavedToIcon, 
  OutputFormatIcon, MediaQualityIcon, MultipleMonitorsIcon, ThemeIcon 
} from "../components/icons";

export function Settings() {
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
        applyTheme(nextSettings.theme);
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load settings", err);
        if (!isMounted) return;
        setLoadError("Failed to load settings.");
      });

    const unlisten = listen<ThemeMode>("theme-changed", (event) => {
      applyTheme(event.payload);
    });

    return () => {
      isMounted = false;
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      unlisten.then(fn => fn());
    };
  }, []);

  const handleSave = async () => {
    if (!draft) return;
    if (draft.hotkeys.region === draft.hotkeys.active_window) {
      setErrors({ active_window: "This shortcut is already used for Region Capture" });
      return;
    }

    setIsSaving(true);
    setErrors({});
    try {
      const result = await settingsSave(draft);
      loadedRef.current = draft;
      applyTheme(draft.theme);
      await emit("theme-changed", draft.theme);
      if (result.warnings.length > 0) {
        for (const w of result.warnings) {
          showToast(`Saved. Shortcut '${w.shortcut}' could not be activated.`, "error");
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
    if (loadedRef.current) {
      setDraft(loadedRef.current);
      applyTheme(loadedRef.current.theme);
      void emit("theme-changed", loadedRef.current.theme);
    }
    setErrors({});
    void getCurrentWindow().close();
  };

  const handleChangeFolder = async () => {
    try {
      const folder = await selectExportFolder();
      if (folder && draft) {
        setDraft({ ...draft, export_folder: folder });
      }
    } catch (err) {
      showToast("Failed to select folder", "error");
    }
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
          <div className="xs-section-title">APPEARANCE</div>
          <div className="xs-card">
            <div className="xs-settings-row">
              <div className="xs-icon-circle"><ThemeIcon /></div>
              <div className="xs-field-label">
                <span className="xs-label-text">Theme</span>
                <span className="xs-label-desc">Switch between light and dark modes</span>
              </div>
              <div className="xs-segmented-control">
                <div 
                  className={`xs-segment ${draft.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => {
                    setDraft({...draft, theme: 'dark'});
                  }}
                >Dark</div>
                <div 
                  className={`xs-segment ${draft.theme === 'light' ? 'active' : ''}`}
                  onClick={() => {
                    setDraft({...draft, theme: 'light'});
                  }}
                >Light</div>
              </div>
            </div>
          </div>
        </section>

        <section className="xs-settings-section">
          <div className="xs-section-title">GENERAL</div>
          <div className="xs-card">
            <div className="xs-settings-row">
              <div className="xs-icon-circle"><LaunchOnStartupIcon /></div>
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
            <div className="xs-divider" />
            <div className="xs-settings-row">
              <div className="xs-field-label">
                <span className="xs-label-text">Region Capture</span>
                <span className="xs-label-desc">Global hotkey to capture region</span>
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
                <span className="xs-label-desc">Global hotkey to capture window</span>
              </div>
              <HotkeyField
                value={draft.hotkeys.active_window}
                onChange={(value) => setDraft({ ...draft, hotkeys: { ...draft.hotkeys, active_window: value } })}
                error={errors.active_window}
              />
            </div>
          </div>
        </section>

        <section className="xs-settings-section">
          <div className="xs-section-title">SOUNDS</div>
          <div className="xs-card">
            <div className="xs-settings-row">
              <div className="xs-icon-circle"><IconSoundIcon /></div>
              <div className="xs-field-label">
                <span className="xs-label-text">Copy sound</span>
                <span className="xs-label-desc">Play a sound after copying to clipboard</span>
              </div>
              <label className="xs-switch">
                <input
                  type="checkbox"
                  checked={draft.play_copy_sound}
                  onChange={(e) => setDraft({ ...draft, play_copy_sound: e.target.checked })}
                />
                <span className="xs-slider"></span>
              </label>
            </div>
            <div className="xs-divider" />
            <div className="xs-settings-row">
              <div className="xs-icon-circle"><ExportSoundIcon /></div>
              <div className="xs-field-label">
                <span className="xs-label-text">Save sound</span>
                <span className="xs-label-desc">Play a sound after saving an image</span>
              </div>
              <label className="xs-switch">
                <input
                  type="checkbox"
                  checked={draft.play_save_sound}
                  onChange={(e) => setDraft({ ...draft, play_save_sound: e.target.checked })}
                />
                <span className="xs-slider"></span>
              </label>
            </div>
          </div>
        </section>

        <section className="xs-settings-section">
          <div className="xs-section-title">EXPORT</div>
          <div className="xs-card">
            <div className="xs-settings-row">
              <div className="xs-icon-circle"><SavedToIcon /></div>
              <div className="xs-field-label">
                <span className="xs-label-text">Screenshots are saved to</span>
                <span className="xs-label-desc xs-truncate-path">{draft.export_folder || "Not configured"}</span>
              </div>
              <button className="xs-btn-change" onClick={handleChangeFolder}>Change...</button>
            </div>
            <div className="xs-divider" />
            <div className="xs-settings-row">
              <div className="xs-icon-circle"><OutputFormatIcon /></div>
              <div className="xs-field-label">
                <span className="xs-label-text">Output format</span>
                <span className="xs-label-desc">Choose the default image format</span>
              </div>
              <div className="xs-segmented-control">
                <div 
                  className={`xs-segment ${draft.export_format === 'PNG' ? 'active' : ''}`}
                  onClick={() => setDraft({...draft, export_format: 'PNG'})}
                >PNG</div>
                <div 
                  className={`xs-segment ${draft.export_format === 'JPEG' ? 'active' : ''}`}
                  onClick={() => setDraft({...draft, export_format: 'JPEG'})}
                >JPEG</div>
              </div>
            </div>
            <div className="xs-divider" />
            <div className="xs-settings-row">
              <div className="xs-icon-circle"><MediaQualityIcon /></div>
              <div className="xs-field-label">
                <span className="xs-label-text">JPEG quality</span>
                <span className="xs-label-desc">JPEG exports use 100% quality</span>
              </div>
              <div className="xs-passive-pill">100%</div>
            </div>
          </div>
        </section>

        <section className="xs-settings-section">
          <div className="xs-section-title">CAPTURE</div>
          <div className="xs-card">
            <div className="xs-settings-row">
              <div className="xs-icon-circle"><MultipleMonitorsIcon /></div>
              <div className="xs-field-label">
                <span className="xs-label-text">Allow region capture on all monitors</span>
                <span className="xs-label-desc">Enable region capture on secondary monitors</span>
              </div>
              <label className="xs-switch">
                <input
                  type="checkbox"
                  checked={draft.capture_all_monitors}
                  onChange={(e) => setDraft({ ...draft, capture_all_monitors: e.target.checked })}
                />
                <span className="xs-slider"></span>
              </label>
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
