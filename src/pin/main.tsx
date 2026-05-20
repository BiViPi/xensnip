import React from "react";
import ReactDOM from "react-dom/client";
import { Pin } from "./Pin";
import { perfLog } from "../ipc";
import "../styles/visual-tokens.css";
import "./Pin.css";

void perfLog(`[PIN] main.tsx loaded search=${window.location.search}`).catch(console.error);

window.addEventListener("error", (event) => {
  void perfLog(`[PIN] window.error message=${event.message} source=${event.filename}:${event.lineno}:${event.colno}`).catch(console.error);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? `${event.reason.name}: ${event.reason.message}` : String(event.reason);
  void perfLog(`[PIN] unhandledrejection reason=${reason}`).catch(console.error);
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  void perfLog("[PIN] root element missing").catch(console.error);
  throw new Error("Pin root element missing");
}

const fallbackEl = document.getElementById("pin-debug-fallback");
if (fallbackEl) {
  fallbackEl.textContent = "main.tsx executing; React booting...";
}

void perfLog("[PIN] root element found; starting React render").catch(console.error);

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Pin />
  </React.StrictMode>
);

queueMicrotask(() => {
  void perfLog("[PIN] React render queued").catch(console.error);
});
