import { useState } from "react";
import { EditorPreset } from "../compose/preset";
import { composeToBlob } from "../compose/compose";
import { clipboardWriteImage, exportSavePng, quickAccessSetBusy } from "../ipc/index";
import { BackgroundControl } from "./controls/Background";
import { RatioControl } from "./controls/Ratio";
import { SliderControl } from "./controls/Slider";
import { ShadowControl } from "./controls/Shadow";

interface Props {
  preset: EditorPreset;
  setPreset: (p: EditorPreset | ((prev: EditorPreset) => EditorPreset)) => void;
  image: HTMLImageElement;
  assetId: string;
  isActionInFlight: boolean;
  setIsActionInFlight: (v: boolean) => void;
  showToast: (m: string, t?: "success" | "error") => void;
}

type ActivePopover = "background" | "ratio" | "padding" | "inset" | "radius" | "shadow" | null;

export function QuickBar({
  preset,
  setPreset,
  image,
  assetId,
  isActionInFlight,
  setIsActionInFlight,
  showToast,
}: Props) {
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);

  const togglePopover = (p: ActivePopover) => {
    setActivePopover(activePopover === p ? null : p);
  };

  const handleCopy = async () => {
    if (isActionInFlight) return;
    void quickAccessSetBusy(assetId, true).catch(() => {});
    setIsActionInFlight(true);
    try {
      const blobBytes = await composeToBlob(image, preset);
      await clipboardWriteImage(blobBytes);
      showToast("Copied to clipboard!");
    } catch (err) {
      console.error("Copy failed", err);
      showToast("Failed to copy image.", "error");
    } finally {
      setIsActionInFlight(false);
      void quickAccessSetBusy(assetId, false).catch(() => {});
    }
  };

  const handleExport = async () => {
    if (isActionInFlight) return;
    void quickAccessSetBusy(assetId, true).catch(() => {});
    setIsActionInFlight(true);
    try {
      const blobBytes = await composeToBlob(image, preset);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const saved = await exportSavePng(blobBytes, `xensnip-${ts}.png`);
      if (saved) {
        showToast("Image exported!");
      }
    } catch (err) {
      console.error("Export failed", err);
      showToast("Failed to export image.", "error");
    } finally {
      setIsActionInFlight(false);
      void quickAccessSetBusy(assetId, false).catch(() => {});
    }
  };

  return (
    <div className="quick-bar-wrapper">
      <div className="quick-bar">
        <div className="control-group">
          <button className={`control-btn ${activePopover === "background" ? "active" : ""}`} onClick={() => togglePopover("background")}>BG</button>
          <button className={`control-btn ${activePopover === "ratio" ? "active" : ""}`} onClick={() => togglePopover("ratio")}>Ratio</button>
          <button className={`control-btn ${activePopover === "padding" ? "active" : ""}`} onClick={() => togglePopover("padding")}>Pad</button>
          <button className={`control-btn ${activePopover === "inset" ? "active" : ""}`} onClick={() => togglePopover("inset")}>Inset</button>
          <button className={`control-btn ${activePopover === "radius" ? "active" : ""}`} onClick={() => togglePopover("radius")}>Rad</button>
          <button className={`control-btn ${activePopover === "shadow" ? "active" : ""}`} onClick={() => togglePopover("shadow")}>Shadow</button>
        </div>
        
        <div className="divider" />
        
        <div className="action-group">
          <button className="action-btn primary" onClick={handleCopy} disabled={isActionInFlight}>Copy</button>
          <button className="action-btn" onClick={handleExport} disabled={isActionInFlight}>Export</button>
        </div>

        {activePopover === "background" && (
          <BackgroundControl value={preset.background} onChange={(v) => setPreset(p => ({ ...p, background: v }))} />
        )}
        {activePopover === "ratio" && (
          <RatioControl value={preset.ratio} onChange={(v) => setPreset(p => ({ ...p, ratio: v }))} />
        )}
        {activePopover === "padding" && (
          <SliderControl label="Padding" min={0} max={96} value={preset.padding} onChange={(v) => setPreset(p => ({ ...p, padding: v }))} />
        )}
        {activePopover === "inset" && (
          <SliderControl label="Inset" min={0} max={96} value={preset.inset} onChange={(v) => setPreset(p => ({ ...p, inset: v }))} />
        )}
        {activePopover === "radius" && (
          <SliderControl label="Radius" min={0} max={32} value={preset.radius} onChange={(v) => setPreset(p => ({ ...p, radius: v }))} />
        )}
        {activePopover === "shadow" && (
          <ShadowControl value={preset.shadow} onChange={(v) => setPreset(p => ({ ...p, shadow: v }))} />
        )}
      </div>
    </div>
  );
}
