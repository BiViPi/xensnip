import React from 'react';
import './CropOverlay.css';

export interface CropOverlayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropResizeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface CropOverlayProps {
  bounds: CropOverlayRect;
  onUpdate: (bounds: CropOverlayRect) => void;
  onCommit: () => void;
  onCancel: () => void;
  scale: number;
  resizeBounds: CropResizeBounds;
  hasAnnotations: boolean;
}

const MIN_CROP_SIZE = 10;

export function resizeCropBounds(
  startBounds: CropOverlayRect,
  handle: string,
  dx: number,
  dy: number,
  resizeBounds: CropResizeBounds
): CropOverlayRect {
  const left = startBounds.x;
  const top = startBounds.y;
  const right = startBounds.x + startBounds.w;
  const bottom = startBounds.y + startBounds.h;

  let nextLeft = left;
  let nextTop = top;
  let nextRight = right;
  let nextBottom = bottom;

  if (handle.includes('w')) {
    nextLeft = Math.min(
      Math.max(resizeBounds.minX, left + dx),
      right - MIN_CROP_SIZE
    );
  }
  if (handle.includes('e')) {
    nextRight = Math.max(
      Math.min(resizeBounds.maxX, right + dx),
      left + MIN_CROP_SIZE
    );
  }
  if (handle.includes('n')) {
    nextTop = Math.min(
      Math.max(resizeBounds.minY, top + dy),
      bottom - MIN_CROP_SIZE
    );
  }
  if (handle.includes('s')) {
    nextBottom = Math.max(
      Math.min(resizeBounds.maxY, bottom + dy),
      top + MIN_CROP_SIZE
    );
  }

  return {
    x: nextLeft,
    y: nextTop,
    w: nextRight - nextLeft,
    h: nextBottom - nextTop,
  };
}

export function CropOverlay({ 
  bounds, 
  onUpdate, 
  onCommit, 
  onCancel, 
  scale, 
  resizeBounds,
  hasAnnotations 
}: CropOverlayProps) {
  
  const handleCommit = () => {
    if (hasAnnotations) {
      if (confirm("Cropping will clear all annotations. Continue?")) {
        onCommit();
      }
    } else {
      onCommit();
    }
  };

  // Handle resizing
  const onMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startBounds = { ...bounds };

    const onMouseMove = (ee: MouseEvent) => {
      const dx = (ee.clientX - startX) / scale;
      const dy = (ee.clientY - startY) / scale;

      onUpdate(resizeCropBounds(startBounds, handle, dx, dy, resizeBounds));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="xs-crop-root" style={{
      position: 'absolute',
      left: `${bounds.x * scale}px`,
      top: `${bounds.y * scale}px`,
      width: `${bounds.w * scale}px`,
      height: `${bounds.h * scale}px`,
      zIndex: 2000,
    }}>
      {/* 3x3 Grid */}
      <div className="xs-crop-grid">
        <div className="xs-grid-line h1" />
        <div className="xs-grid-line h2" />
        <div className="xs-grid-line v1" />
        <div className="xs-grid-line v2" />
      </div>

      {/* Handles */}
      <div className="xs-crop-handle nw" onMouseDown={(e) => onMouseDown(e, 'nw')} />
      <div className="xs-crop-handle ne" onMouseDown={(e) => onMouseDown(e, 'ne')} />
      <div className="xs-crop-handle sw" onMouseDown={(e) => onMouseDown(e, 'sw')} />
      <div className="xs-crop-handle se" onMouseDown={(e) => onMouseDown(e, 'se')} />
      <div className="xs-crop-handle n" onMouseDown={(e) => onMouseDown(e, 'n')} />
      <div className="xs-crop-handle s" onMouseDown={(e) => onMouseDown(e, 's')} />
      <div className="xs-crop-handle w" onMouseDown={(e) => onMouseDown(e, 'w')} />
      <div className="xs-crop-handle e" onMouseDown={(e) => onMouseDown(e, 'e')} />

      {/* Action Buttons */}
      <div className="xs-crop-actions">
        <button className="xs-crop-btn cancel" onClick={onCancel}>Cancel</button>
        <button className="xs-crop-btn commit" onClick={handleCommit}>Crop</button>
      </div>
    </div>
  );
}
