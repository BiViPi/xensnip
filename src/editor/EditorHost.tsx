import { useEffect, useState } from "react";
import { assetReadPng } from "../ipc";

export function EditorHost() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    const params = new URLSearchParams(window.location.search);
    const assetId = params.get("asset_id");
    if (!assetId) {
      setError("No asset_id provided.");
      return;
    }

    void (async () => {
      try {
        const pngBytes = await assetReadPng(assetId);
        objectUrl = URL.createObjectURL(new Blob([pngBytes], { type: "image/png" }));
        setPreviewUrl(objectUrl);
      } catch {
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
