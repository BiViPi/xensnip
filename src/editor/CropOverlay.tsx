import React from 'react';
import './CropOverlay.css';

interface CropOverlayProps {
  bounds: { x: number; y: number; w: number; h: number };
  onUpdate: (bounds: { x: number; y: number; w: number; h: number }) => void;
  onCommit: () => void;
  onCancel: () => void;
  scale: number;
  imageWidth: number;
  imageHeight: number;
  hasAnnotations: boolean;
}

export function CropOverlay({ 
  bounds, 
  onUpdate, 
  onCommit, 
  onCancel, 
  scale, 
  imageWidth, 
  imageHeight,
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
      
      let next = { ...startBounds };
      if (handle.includes('n')) { next.y = Math.max(0, startBounds.y + dy); next.h = Math.max(10, startBounds.h - (next.y - startBounds.y)); }
      if (handle.includes('s')) { next.h = Math.max(10, Math.min(imageHeight - next.y, startBounds.h + dy)); }
      if (handle.includes('w')) { next.x = Math.max(0, startBounds.x + dx); next.w = Math.max(10, startBounds.w - (next.x - startBounds.x)); }
      if (handle.includes('e')) { next.w = Math.max(10, Math.min(imageWidth - next.x, startBounds.w + dx)); }
      
      onUpdate(next);
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
