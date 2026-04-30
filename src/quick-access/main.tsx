import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuickAccess } from "./QuickAccess";
import "./QuickAccess.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QuickAccess />
  </StrictMode>
);
