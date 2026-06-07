import React from "react";
import {
  CanvasDocument,
  CanvasImageObject,
  getSelectedCanvasImage,
  replaceCanvasImage,
  selectCanvasImage,
} from "./canvasDocument";
import { EditorPreset } from "../compose/preset";
import { getCanvasDocumentDimensions } from "../compose/canvasDocument";
import { recordHistorySnapshot } from "./historyBridge";

interface Props {
  canvasDocument: CanvasDocument;
  preset: EditorPreset;
  previewScale: number;
  interactive: boolean;
  onCanvasDocumentChange: (canvas: CanvasDocument) => void;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type CornerResizeHandle = "nw" | "ne" | "se" | "sw";

const MIN_IMAGE_SIZE = 40;
const CORNER_HANDLE_LAYOUT: CornerResizeHandle[] = ["nw", "ne", "se", "sw"];

export function CanvasImageOverlay({
  canvasDocument,
  preset,
  previewScale,
  interactive,
  onCanvasDocumentChange,
}: Props) {
  const isMultiImageLayout = canvasDocument.images.length > 1;
  const dims = getCanvasDocumentDimensions(canvasDocument, preset);
  const selectedImage = getSelectedCanvasImage(canvasDocument);

  const updateImage = React.useCallback(
    (imageId: string, patch: Partial<CanvasImageObject>) => {
      onCanvasDocumentChange(replaceCanvasImage(canvasDocument, imageId, patch));
    },
    [canvasDocument, onCanvasDocumentChange]
  );

  const beginMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>, imageObject: CanvasImageObject) => {
      if (!interactive || !isMultiImageLayout) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      recordHistorySnapshot();
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = imageObject.x;
      const originY = imageObject.y;
      const previousCursor = document.body.style.cursor;
      document.body.style.cursor = "move";

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - startX) / previewScale;
        const dy = (moveEvent.clientY - startY) / previewScale;
        updateImage(imageObject.id, {
          x: originX + dx,
          y: originY + dy,
        });
      };

      const onPointerUp = () => {
        document.body.style.cursor = previousCursor;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [interactive, isMultiImageLayout, previewScale, updateImage]
  );

  const beginResize = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>, imageObject: CanvasImageObject, handle: CornerResizeHandle) => {
      if (!interactive || !isMultiImageLayout) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      recordHistorySnapshot();
      const startX = event.clientX;
      const startY = event.clientY;
      const start = {
        x: imageObject.x,
        y: imageObject.y,
        width: imageObject.width,
        height: imageObject.height,
      };
      const previousCursor = document.body.style.cursor;
      document.body.style.cursor = handleCursor(handle);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - startX) / previewScale;
        const dy = (moveEvent.clientY - startY) / previewScale;
        const next = resizeImageRectUniform(start, handle, dx, dy);
        updateImage(imageObject.id, next);
      };

      const onPointerUp = () => {
        document.body.style.cursor = previousCursor;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [interactive, isMultiImageLayout, previewScale, updateImage]
  );

  if (!interactive || !isMultiImageLayout) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 950,
        pointerEvents: "none",
      }}
    >
      {canvasDocument.images.map((imageObject) => {
        const isSelected = selectedImage?.id === imageObject.id;
        const left = (imageObject.x + dims.contentOffsetX) * previewScale;
        const top = (imageObject.y + dims.contentOffsetY) * previewScale;
        const width = imageObject.width * previewScale;
        const height = imageObject.height * previewScale;

        return (
          <div
            key={imageObject.id}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              outline: isSelected ? "2px solid rgba(99, 102, 241, 0.95)" : "1px solid rgba(255,255,255,0.28)",
              boxShadow: isSelected ? "0 0 0 1px rgba(15, 23, 42, 0.85)" : "none",
              cursor: "move",
              pointerEvents: "auto",
              borderRadius: 4,
              willChange: "transform, width, height",
              backfaceVisibility: "hidden",
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onCanvasDocumentChange(selectCanvasImage(canvasDocument, imageObject.id));
              beginMove(event, imageObject);
            }}
          >
            {isSelected && CORNER_HANDLE_LAYOUT.map((handle) => (
              <div
                key={handle}
                style={handleStyle(handle)}
                onPointerDown={(event) => beginResize(event, imageObject, handle)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function resizeImageRectUniform(
  start: { x: number; y: number; width: number; height: number },
  handle: CornerResizeHandle,
  dx: number,
  dy: number
) {
  const minScale = Math.max(MIN_IMAGE_SIZE / start.width, MIN_IMAGE_SIZE / start.height);
  let deltaScale = 0;
  switch (handle) {
    case "se":
      deltaScale = Math.max(dx / start.width, dy / start.height);
      break;
    case "sw":
      deltaScale = Math.max(-dx / start.width, dy / start.height);
      break;
    case "ne":
      deltaScale = Math.max(dx / start.width, -dy / start.height);
      break;
    case "nw":
      deltaScale = Math.max(-dx / start.width, -dy / start.height);
      break;
  }
  const scale = Math.max(minScale, 1 + deltaScale);
  const nextWidth = start.width * scale;
  const nextHeight = start.height * scale;
  let nextX = start.x;
  let nextY = start.y;

  if (handle.includes("w")) {
    nextX = start.x + (start.width - nextWidth);
  }
  if (handle.includes("n")) {
    nextY = start.y + (start.height - nextHeight);
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

function handleStyle(handle: ResizeHandle): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    background: "#6366f1",
    border: "2px solid white",
    borderRadius: 3,
    marginLeft: -6,
    marginTop: -6,
    boxSizing: "border-box",
  };

  switch (handle) {
    case "nw":
      return { ...base, left: 0, top: 0, cursor: "nwse-resize" };
    case "ne":
      return { ...base, left: "100%", top: 0, cursor: "nesw-resize" };
    case "se":
      return { ...base, left: "100%", top: "100%", cursor: "nwse-resize" };
    case "sw":
      return { ...base, left: 0, top: "100%", cursor: "nesw-resize" };
    case "n":
      return { ...base, left: "50%", top: 0, cursor: "ns-resize" };
    case "e":
      return { ...base, left: "100%", top: "50%", cursor: "ew-resize" };
    case "s":
      return { ...base, left: "50%", top: "100%", cursor: "ns-resize" };
    case "w":
      return { ...base, left: 0, top: "50%", cursor: "ew-resize" };
  }
}

function handleCursor(handle: CornerResizeHandle): string {
  switch (handle) {
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
  }
}
