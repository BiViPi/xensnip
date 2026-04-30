import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EditorHost } from "./EditorHost";
import "./editor.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EditorHost />
  </StrictMode>
);
