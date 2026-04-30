import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuickAccess } from "./QuickAccess";
import "./QuickAccess.css";

const root = document.getElementById("root");

createRoot(root!).render(
  <StrictMode>
    <QuickAccess />
  </StrictMode>
);
