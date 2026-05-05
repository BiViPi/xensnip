import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { ScreenshotDocument } from '../editor/useScreenshotDocuments';
import { LeftPanelItem } from './LeftPanelItem';
import './LeftPanel.css';

interface Props {
  documents: ScreenshotDocument[];
  activeDocumentId: string | null;
  isCollapsed: boolean;
  expandedWidth: number;
  onCollapsedChange: (v: boolean) => void;
  onSelect: (id: string) => void;
  onCheckboxToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LeftPanel({
  documents,
  activeDocumentId,
  isCollapsed,
  expandedWidth,
  onCollapsedChange,
  onSelect,
  onCheckboxToggle,
  onDelete,
}: Props) {

  return (
    <div
      className={`xs-left-panel ${isCollapsed ? 'is-collapsed' : ''}`}
      style={{ ['--xs-left-panel-width' as string]: `${expandedWidth}px` }}
      onClick={isCollapsed ? () => onCollapsedChange(false) : undefined}
    >
      {isCollapsed && (
        <button
          className="xs-left-collapsed-handle"
          onClick={(e) => {
            e.stopPropagation();
            onCollapsedChange(false);
          }}
          title="Expand"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {!isCollapsed && (
        <div className="xs-left-header">
          <div className="xs-left-header-content">
            <span className="xs-left-title">Session</span>
            <div className="xs-left-count-badge">
              <div className="xs-left-count-dot" />
              <span>{documents.length}</span>
            </div>
          </div>
          
          <button 
            className="xs-left-toggle-floating"
            onClick={() => onCollapsedChange(true)}
            title="Collapse"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}

      <div className="xs-left-list">
        {documents.length === 0 ? (
          <div className="xs-left-empty">
            <Camera size={42} className="xs-left-empty-icon" />
            <span className="xs-left-empty-text">No captures yet</span>
          </div>
        ) : (
          documents.map((doc) => (
            <LeftPanelItem
              key={doc.id}
              doc={doc}
              isActive={doc.id === activeDocumentId}
              onSelect={() => onSelect(doc.id)}
              onToggleCheck={() => onCheckboxToggle(doc.id)}
              onDelete={() => onDelete(doc.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
