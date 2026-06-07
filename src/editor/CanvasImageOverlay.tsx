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

const MIN_IMAGE_SIZE = 40;

export function CanvasImageOverlay({
  canvasDocument,
  preset,
  previewScale,
  interactive,
  onCanvasDocumentChange,
}: Props) {
  const dims = getCanvasDocumentDimensions(canvasDocument, preset);
  const selectedImage = getSelectedCanvasImage(canvasDocument);

  const updateImage = React.useCallback(
    (imageId: string, patch: Partial<CanvasImageObject>) => {
      onCanvasDocumentChange(replaceCanvasImage(canvasDocument, imageId, patch));
    },
    [canvasDocument, onCanvasDocumentChange]
  );

  const beginMove = React.useCallback(
    (event: React.MouseEvent, imageObject: CanvasImageObject) => {
      if (!interactive) return;
      event.preventDefault();
      event.stopPropagation();
      recordHistorySnapshot();
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = imageObject.x;
      const originY = imageObject.y;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startX) / previewScale;
        const dy = (moveEvent.clientY - startY) / previewScale;
        updateImage(imageObject.id, {
          x: originX + dx,
          y: originY + dy,
        });
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [interactive, previewScale, updateImage]
  );

  const beginResize = React.useCallback(
    (event: React.MouseEvent, imageObject: CanvasImageObject, handle: ResizeHandle) => {
      if (!interactive) return;
      event.preventDefault();
      event.stopPropagation();
      recordHistorySnapshot();
      const startX = event.clientX;
      const startY = event.clientY;
      const start = {
        x: imageObject.x,
        y: imageObject.y,
        width: imageObject.width,
        height: imageObject.height,
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startX) / previewScale;
        const dy = (moveEvent.clientY - startY) / previewScale;
        const next = resizeImageRect(start, handle, dx, dy);
        updateImage(imageObject.id, next);
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [interactive, previewScale, updateImage]
  );

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
              cursor: interactive ? "move" : "default",
              pointerEvents: interactive ? "auto" : "none",
              borderRadius: 4,
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
              onCanvasDocumentChange(selectCanvasImage(canvasDocument, imageObject.id));
              beginMove(event, imageObject);
            }}
          >
            {isSelected && interactive && HANDLE_LAYOUT.map((handle) => (
              <div
                key={handle}
                style={handleStyle(handle)}
                onMouseDown={(event) => beginResize(event, imageObject, handle)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function resizeImageRect(
  start: { x: number; y: number; width: number; height: number },
  handle: ResizeHandle,
  dx: number,
  dy: number
) {
  let nextX = start.x;
  let nextY = start.y;
  let nextWidth = start.width;
  let nextHeight = start.height;

  if (handle.includes("e")) {
    nextWidth = Math.max(MIN_IMAGE_SIZE, start.width + dx);
  }
  if (handle.includes("s")) {
    nextHeight = Math.max(MIN_IMAGE_SIZE, start.height + dy);
  }
  if (handle.includes("w")) {
    nextWidth = Math.max(MIN_IMAGE_SIZE, start.width - dx);
    nextX = start.x + (start.width - nextWidth);
  }
  if (handle.includes("n")) {
    nextHeight = Math.max(MIN_IMAGE_SIZE, start.height - dy);
    nextY = start.y + (start.height - nextHeight);
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

const HANDLE_LAYOUT: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

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
    case "n":
      return { ...base, left: "50%", top: 0, cursor: "ns-resize" };
    case "ne":
      return { ...base, left: "100%", top: 0, cursor: "nesw-resize" };
    case "e":
      return { ...base, left: "100%", top: "50%", cursor: "ew-resize" };
    case "se":
      return { ...base, left: "100%", top: "100%", cursor: "nwse-resize" };
    case "s":
      return { ...base, left: "50%", top: "100%", cursor: "ns-resize" };
    case "sw":
      return { ...base, left: 0, top: "100%", cursor: "nesw-resize" };
    case "w":
      return { ...base, left: 0, top: "50%", cursor: "ew-resize" };
  }
}
