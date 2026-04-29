import { useEffect, useState } from "react";
import { appPing, settingsLoad } from "./ipc";
import { PingResponse, Settings } from "./ipc/types";
import "./App.css";

function App() {
  const [pingData, setPingData] = useState<PingResponse | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [p, s] = await Promise.all([appPing(), settingsLoad()]);
        setPingData(p);
        setSettings(s);
      } catch (err) {
        console.error("Failed to initialize IPC", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return <div className="container">Loading XenSnip...</div>;
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title-row">
          <h1>XenSnip</h1>
          <div className="status-badge">Sprint 00 Baseline</div>
        </div>
        <p className="subtitle">Production Repo Foundation Verified</p>
      </div>

      <section className="smoke-test">
        <div className="card">
          <h3>IPC Smoke Test: app.ping</h3>
          <pre>{JSON.stringify(pingData, null, 2)}</pre>
        </div>

        <div className="card">
          <h3>IPC Smoke Test: settings.load</h3>
          <pre>{JSON.stringify(settings, null, 2)}</pre>
        </div>
      </section>

      <footer>
        <p>Tray resident mode active. Check logs in %APPDATA%/XenSnip/logs/</p>
      </footer>
    </div>
  );
}

export default App;
