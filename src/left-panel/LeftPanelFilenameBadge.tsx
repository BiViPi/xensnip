import React, { useState, useEffect, useRef } from 'react';
import { FileEdit } from 'lucide-react';
import { normalizeFilenameStem } from '../editor/normalizeFilenameStem';
import { Tooltip } from '../editor/Tooltip';

interface LeftPanelFilenameBadgeProps {
  filename?: string;
  onCommit: (name: string | undefined) => void;
}

export function LeftPanelFilenameBadge({
  filename,
  onCommit,
}: LeftPanelFilenameBadgeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localName, setLocalName] = useState(filename ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    if (!isEditing && !isDirty) {
      setLocalName(filename ?? "");
    }
  }, [filename, isEditing, isDirty]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    const next = normalizeFilenameStem(localName);
    onCommit(next || undefined);
    setIsDirty(false);
    setIsEditing(false);
  };

  const cancel = () => {
    setLocalName(filename ?? "");
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      skipBlurCommitRef.current = true;
      cancel();
    } else {
      e.stopPropagation(); // Prevent triggering shortcuts while typing
    }
  };

  const badgeContent = (
    <div 
      className="xs-left-filename-badge"
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing) setIsEditing(true);
      }}
    >
      <FileEdit size={12} className="xs-left-filename-icon" />
      {isEditing ? (
        <input
          ref={inputRef}
          className="xs-left-filename-input"
          value={localName}
          onChange={(e) => {
            setLocalName(e.target.value);
            setIsDirty(true);
          }}
          onBlur={() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              return;
            }
            commit();
          }}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className={`xs-left-filename-label ${!filename ? 'xs-left-filename-placeholder' : ''}`}>
          {filename || "Name your file..."}
        </div>
      )}
    </div>
  );

  if (isEditing) return badgeContent;

  return (
    <Tooltip text="Click to name this file" position="top">
      {badgeContent}
    </Tooltip>
  );
}
