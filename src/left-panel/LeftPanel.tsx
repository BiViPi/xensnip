import React from 'react';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { ScreenshotDocument } from '../editor/useScreenshotDocuments';
import { LeftPanelItem } from './LeftPanelItem';
import './LeftPanel.css';

interface Props {
  documents: ScreenshotDocument[];
  activeDocumentId: string | null;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelect: (id: string) => void;
  onCheckboxToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LeftPanel({
  documents,
  activeDocumentId,
  isCollapsed,
  onCollapsedChange,
  onSelect,
  onCheckboxToggle,
  onDelete
}: Props) {
  return (
    <div className={`xs-left-panel ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      {!isCollapsed && (
        <div className="xs-left-header">
          <div className="xs-left-title">
            Session <span className="xs-left-count-dot" /> <span className="xs-left-count">{documents.length}</span>
          </div>
          <button 
            className="xs-left-collapse-btn"
            onClick={() => onCollapsedChange(true)}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {isCollapsed && (
        <button 
          className="xs-left-expand-btn"
          onClick={() => onCollapsedChange(false)}
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* List Container */}
      <div className="xs-left-list-container">
        {documents.length > 0 ? (
          <div className="xs-left-list">
            {documents.map((doc) => (
              <LeftPanelItem
                key={doc.id}
                doc={doc}
                isActive={doc.id === activeDocumentId}
                onSelect={onSelect}
                onCheckboxToggle={onCheckboxToggle}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          !isCollapsed && (
            <div className="xs-left-empty">
              <div className="xs-left-empty-icon">
                <Camera size={42} strokeWidth={1} />
              </div>
              <div className="xs-left-empty-text">No captures yet</div>
            </div>
          )
        )}
      </div>

      {/* Footer / Hint */}
      {!isCollapsed && documents.length > 0 && (
        <div className="xs-left-footer">
          <div className="xs-left-footer-hint">Collapse to dot rail</div>
          <div className="xs-left-footer-icons">
             <div className="xs-left-mini-dot" />
             <div className="xs-left-mini-dot" />
             <div className="xs-left-mini-dot" />
             <ChevronRight size={14} opacity={0.5} />
          </div>
        </div>
      )}
    </div>
  );
}
