import { invoke } from "@tauri-apps/api/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuickAccess } from "./QuickAccess";
import "./QuickAccess.css";

const root = document.getElementById("root");
void invoke("debug_webview_probe", {
  label: "quick-access",
  stage: "main_loaded",
  href: window.location.href,
  rootChildren: root?.childElementCount ?? -1,
  scripts: document.scripts.length,
}).catch(() => {});

createRoot(root!).render(
  <StrictMode>
    <QuickAccess />
  </StrictMode>
);

queueMicrotask(() => {
  void invoke("debug_webview_probe", {
    label: "quick-access",
    stage: "main_render_called",
    href: window.location.href,
    rootChildren: root?.childElementCount ?? -1,
    scripts: document.scripts.length,
  }).catch(() => {});
});
