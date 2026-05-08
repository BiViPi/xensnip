import { createRoot } from "react-dom/client";
import "../components/icons/icon-tokens.css";
import "../styles/visual-tokens.css";
import "../styles/visual-depth.css";
import "../styles/visual-states.css";
import { QuickAccess } from "./QuickAccess";
import "./QuickAccess.css";
import "./QuickAccessDock.css";
import "./EditorControls.css";
import "./Slider.css";
import "./Toast.css";

const root = document.getElementById("root");

createRoot(root!).render(
  <QuickAccess />
);
