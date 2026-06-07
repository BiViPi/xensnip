import type { PointerEvent } from 'react';
import { Pen, X } from 'lucide-react';
import { ScreenshotDocument } from '../editor/useScreenshotDocuments';
import { Tooltip } from '../editor/Tooltip';
import { LeftPanelFilenameBadge } from './LeftPanelFilenameBadge';

interface Props {
  doc: ScreenshotDocument;
  isActive: boolean;
  isDragSource: boolean;
  isDropTarget: boolean;
  isBlockedTarget: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onDelete: () => void;
  onRename: (name: string | undefined) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

export function LeftPanelItem({
  doc,
  isActive,
  isDragSource,
  isDropTarget,
  isBlockedTarget,
  onSelect,
  onToggleCheck,
  onDelete,
  onRename,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  // Determine if edited: has annotations or cropBounds
  const isEdited = doc.annotation.objects.length > 0 || doc.cropBounds !== null;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('[data-no-drag="true"]')) {
      return;
    }
    onPointerDown(event);
  };

  return (
    <div
      className={[
        'xs-left-item-wrapper',
        isActive ? 'is-active' : '',
        isDragSource ? 'is-drag-source' : '',
        isDropTarget ? 'is-drop-target' : '',
        isBlockedTarget ? 'is-drop-blocked' : '',
      ].filter(Boolean).join(' ')}
    >
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

      <div
        className="xs-left-item-card"
        onClick={onSelect}
        onPointerDown={handlePointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onDragStart={(event) => {
          event.preventDefault();
        }}
      >
        <div className="xs-left-thumb-container">
          <img
            src={doc.thumbnailSrc}
            alt="Capture"
            className="xs-left-thumb"
            draggable={false}
            onDragStart={(event) => {
              event.preventDefault();
            }}
          />
        </div>

        <div className="xs-left-card-footer" data-no-drag="true">
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
              data-no-drag="true"
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
