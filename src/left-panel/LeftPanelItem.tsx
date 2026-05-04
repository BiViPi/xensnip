import React from 'react';
import { Pen, X } from 'lucide-react';
import { ScreenshotDocument } from '../editor/useScreenshotDocuments';

interface Props {
  doc: ScreenshotDocument;
  isActive: boolean;
  onSelect: (id: string) => void;
  onCheckboxToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LeftPanelItem({ doc, isActive, onSelect, onCheckboxToggle, onDelete }: Props) {
  const hasAnnotations = doc.annotation.objects.length > 0 || doc.cropBounds !== null;

  return (
    <div 
      className={`xs-left-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(doc.id)}
    >
      {/* Active side rail glow */}
      {isActive && <div className="xs-left-active-rail" />}

      {/* Export Selection Dot */}
      <div 
        className={`xs-left-dot-container`}
        onClick={(e) => {
          e.stopPropagation();
          onCheckboxToggle(doc.id);
        }}
      >
        <div className={`xs-left-dot ${doc.isExportChecked ? 'checked' : ''}`} />
      </div>

      {/* Thumbnail Container */}
      <div className="xs-left-thumb-container">
        {/* Depth Glow behind thumb */}
        <div className="xs-left-thumb-glow" />
        
        <img 
          src={doc.thumbnailSrc} 
          alt="Capture" 
          className="xs-left-thumb" 
        />

        {/* Indicators Overlay */}
        <div className="xs-left-indicators">
          {hasAnnotations && (
            <div className="xs-left-indicator-badge pen">
              <Pen size={12} strokeWidth={2.5} />
            </div>
          )}
          
          <button 
            className="xs-left-indicator-badge delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc.id);
            }}
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
