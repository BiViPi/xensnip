import React from 'react';
import { useScopedIds } from "../useScopedIds";

interface IconProps {
  size?: number;
  className?: string;
}

export const CropCanvasIcon = ({ size = 20, className }: IconProps) => {
  const ids = useScopedIds(["grad"] as const);

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 1024 1024" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={ids.grad} x1="150" y1="150" x2="870" y2="870" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      <g fill={`url(#${ids.grad})`}>
        <rect x="230" y="140" width="80" height="640" rx="20" />
        <rect x="150" y="220" width="640" height="80" rx="20" />
        <rect x="230" y="700" width="260" height="80" rx="20" />
        <rect x="710" y="220" width="80" height="260" rx="20" />
      </g>

      <path d="M 280 500 L 360 420 L 360 470 L 660 470 L 660 420 L 740 500 L 660 580 L 660 530 L 360 530 L 360 580 Z" 
            transform="rotate(-45 510 500)" 
            fill={`url(#${ids.grad})`} 
            stroke={`url(#${ids.grad})`} 
            strokeWidth="20" 
            strokeLinejoin="round" />

      <g>
        <path d="M 845.26 795 A 110 110 0 1 1 750 630" 
              stroke={`url(#${ids.grad})`} 
              strokeWidth="80" 
              strokeLinecap="butt" />
        <circle cx="845.26" cy="795" r="40" fill={`url(#${ids.grad})`} />
        <path d="M 750 530 L 870 630 L 750 730 Z" 
              fill={`url(#${ids.grad})`} 
              stroke={`url(#${ids.grad})`} 
              strokeWidth="20" 
              strokeLinejoin="round" />
      </g>
    </svg>
  );
};
