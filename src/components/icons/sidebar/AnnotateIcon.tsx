import React from 'react';
import { useScopedIds } from "../useScopedIds";

interface IconProps {
  size?: number;
  className?: string;
}

export const AnnotateIcon = ({ size = 20, className }: IconProps) => {
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
        <linearGradient id={ids.grad} x1="170" y1="840" x2="870" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      <path d="M 250 720 C 230 800, 450 880, 770 610" 
            stroke={`url(#${ids.grad})`} 
            strokeWidth="48" 
            strokeLinecap="round" />
            
      <path d="M 650 630 L 770 610 L 740 720" 
            stroke={`url(#${ids.grad})`} 
            strokeWidth="48" 
            strokeLinecap="round" 
            strokeLinejoin="round" />

      <g transform="translate(580, 410) rotate(45)" fill={`url(#${ids.grad})`}>
        <path d="M -70 -205 L 70 -205 L 70 -275 A 30 30 0 0 0 40 -305 L -40 -305 A 30 30 0 0 0 -70 -275 Z" />
        <rect x="-70" y="-180" width="140" height="350" />
        <path d="M -70 195 L 70 195 L 12 350 Q 0 370 -12 350 Z" />
      </g>
    </svg>
  );
};
