import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EditorHost } from "./EditorHost";
import "./editor.css";

console.info("[editor] main.tsx loaded", window.location.href);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EditorHost />
  </StrictMode>
);
