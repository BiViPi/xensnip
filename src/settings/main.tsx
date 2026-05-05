import React from "react";
import ReactDOM from "react-dom/client";
import "../components/icons/icon-tokens.css";
import "../styles/visual-tokens.css";
import "../styles/visual-depth.css";
import "../styles/visual-states.css";
import { Settings } from "./Settings";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Settings />
  </React.StrictMode>
);
