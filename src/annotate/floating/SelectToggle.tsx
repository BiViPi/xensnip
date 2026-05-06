import React from 'react';

interface Option {
  label: string;
  value: any;
}

interface Props {
  options: Option[];
  value: any;
  onChange: (val: any) => void;
  icon?: React.ReactNode;
  title?: string;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function SelectToggle({ options, value, onChange, icon, title, isOpen, onToggle }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`xs-toolbar-btn ${isOpen ? 'active' : ''}`}
        onClick={() => onToggle(!isOpen)}
        title={title}
      >
        {icon}
      </button>
      {isOpen && (
        <div className="xs-toolbar-slider-popover" style={{ minWidth: '80px', padding: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {options.map((opt) => (
              <button
                key={opt.value}
                className={`xs-toolbar-btn ${value === opt.value ? 'active' : ''}`}
                style={{ 
                  width: '100%', 
                  justifyContent: 'flex-start', 
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  height: '24px'
                }}
                onClick={() => {
                  onChange(opt.value);
                  onToggle(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
