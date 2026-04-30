import { useEffect, useState } from "react";
import { assetReadPng } from "../ipc/index";

export function EditorHost() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.info("[editor] host mount", window.location.href);
    let objectUrl: string | null = null;
    const params = new URLSearchParams(window.location.search);
    const assetId = params.get("asset_id");
    if (!assetId) {
      console.error("[editor] missing asset_id");
      setError("No asset_id provided.");
      return;
    }

    void (async () => {
      try {
        const pngBytes = await assetReadPng(assetId);
        console.info("[editor] asset_read_png bytes", pngBytes.length);
        objectUrl = URL.createObjectURL(new Blob([pngBytes], { type: "image/png" }));
        setPreviewUrl(objectUrl);
      } catch {
        console.error("[editor] asset_read_png failed");
        setError("Could not load captured screenshot.");
      }
    })();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="editor-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!previewUrl) {
    return <div className="editor-loading">Loading capture...</div>;
  }

  return (
    <div className="editor-shell">
      <img
        src={previewUrl}
        alt="Captured screenshot"
        className="editor-image"
        onError={() => setError("Could not load captured screenshot.")}
      />
      <p className="editor-hint">Editor controls coming in Sprint 04.</p>
    </div>
  );
}
