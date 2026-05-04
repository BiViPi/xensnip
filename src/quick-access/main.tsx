import { createRoot } from "react-dom/client";
import "../components/icons/icon-tokens.css";
import { QuickAccess } from "./QuickAccess";
import "./QuickAccess.css";

const root = document.getElementById("root");

createRoot(root!).render(
  <QuickAccess />
);
