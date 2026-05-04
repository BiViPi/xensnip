import { Pen, X } from 'lucide-react';
import { ScreenshotDocument } from '../editor/useScreenshotDocuments';

interface Props {
  doc: ScreenshotDocument;
  isActive: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onDelete: () => void;
}

export function LeftPanelItem({
  doc,
  isActive,
  onSelect,
  onToggleCheck,
  onDelete,
}: Props) {
  // Determine if edited: has annotations or cropBounds
  const isEdited = doc.annotation.objects.length > 0 || doc.cropBounds !== null;

  return (
    <div className={`xs-left-item-wrapper ${isActive ? 'is-active' : ''}`}>
      <div className="xs-left-active-rail" />
      
      <div 
        className={`xs-left-export-dot ${doc.isExportChecked ? 'is-checked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCheck();
        }}
      />

      <div className="xs-left-item-card" onClick={onSelect}>
        <div className="xs-left-thumb-container">
          <img src={doc.thumbnailSrc} alt="Capture" className="xs-left-thumb" />
        </div>

        {isEdited && (
          <div className="xs-left-item-badge edited-badge">
            <Pen size={14} />
          </div>
        )}

        <button 
          className="xs-left-item-badge delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
