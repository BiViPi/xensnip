import React from "react";
import ReactDOM from "react-dom/client";
import { Delay } from "./Delay";
import "../styles/visual-tokens.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Delay />
  </React.StrictMode>
);
