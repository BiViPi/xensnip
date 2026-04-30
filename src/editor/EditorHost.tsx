import { useEffect, useState } from "react";

export function EditorHost() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assetUri = params.get("asset_uri");
    if (!assetUri) {
      setError("No asset_uri provided.");
      return;
    }
    setPreviewUrl(assetUri);
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
      <img src={previewUrl} alt="Captured screenshot" className="editor-image" />
      <p className="editor-hint">Editor controls coming in Sprint 04.</p>
    </div>
  );
}
