import { Pen, X } from 'lucide-react';
import { ScreenshotDocument } from '../editor/useScreenshotDocuments';
import { Tooltip } from '../editor/Tooltip';
import { LeftPanelFilenameBadge } from './LeftPanelFilenameBadge';

interface Props {
  doc: ScreenshotDocument;
  isActive: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onDelete: () => void;
  onRename: (name: string | undefined) => void;
}

export function LeftPanelItem({
  doc,
  isActive,
  onSelect,
  onToggleCheck,
  onDelete,
  onRename,
}: Props) {
  // Determine if edited: has annotations or cropBounds
  const isEdited = doc.annotation.objects.length > 0 || doc.cropBounds !== null;

  return (
    <div className={`xs-left-item-wrapper ${isActive ? 'is-active' : ''}`}>
      <div className="xs-left-active-rail" />
      
      <Tooltip text="Mark for Export" position="right">
        <div 
          className={`xs-left-export-dot ${doc.isExportChecked ? 'is-checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck();
          }}
        />
      </Tooltip>

      <div className="xs-left-item-card" onClick={onSelect}>
        <div className="xs-left-thumb-container">
          <img src={doc.thumbnailSrc} alt="Capture" className="xs-left-thumb" />
        </div>

        <div className="xs-left-card-footer">
          <LeftPanelFilenameBadge
            filename={doc.filename}
            onCommit={onRename}
          />
        </div>

        {isEdited && (
          <div className="xs-left-item-badge edited-badge">
            <Pen size={14} />
          </div>
        )}

        <div className="xs-left-delete-wrap">
          <Tooltip text="Delete" position="top">
            <button 
              className="xs-left-item-badge delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
