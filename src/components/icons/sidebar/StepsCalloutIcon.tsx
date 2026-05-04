import React from 'react';
import { useScopedIds } from "../useScopedIds";

interface IconProps {
  size?: number;
  className?: string;
}

export const StepsCalloutIcon = ({ size = 20, className }: IconProps) => {
  const ids = useScopedIds(["grad", "bubbleMask", "badgeMask"] as const);

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

        <mask id={ids.bubbleMask}>
          <rect x="0" y="0" width="1024" height="1024" fill="white" />
          <circle cx="310" cy="340" r="165" fill="black" />
        </mask>

        <mask id={ids.badgeMask}>
          <rect x="0" y="0" width="1024" height="1024" fill="white" />
          <path d="M 275 310 L 315 270 L 315 410" 
                stroke="black" 
                strokeWidth="40" 
                strokeLinecap="round" 
                strokeLinejoin="round" />
        </mask>
      </defs>

      <g mask={`url(#${ids.bubbleMask})`}>
        <path d="M 330 300 
                 L 690 300 A 80 80 0 0 1 770 380 
                 L 770 620 A 80 80 0 0 1 690 700 
                 L 470 700 
                 L 370 800 L 370 700 
                 L 330 700 A 80 80 0 0 1 250 620 
                 L 250 380 A 80 80 0 0 1 330 300 Z" 
              stroke={`url(#${ids.grad})`} 
              strokeWidth="48" 
              strokeLinejoin="round" />
      </g>

      <path d="M 450 470 L 650 470" 
            stroke={`url(#${ids.grad})`} 
            strokeWidth="48" 
            strokeLinecap="round" />
            
      <path d="M 370 560 L 650 560" 
            stroke={`url(#${ids.grad})`} 
            strokeWidth="48" 
            strokeLinecap="round" />

      <circle cx="310" cy="340" r="130" fill={`url(#${ids.grad})`} mask={`url(#badgeMask)`} />
    </svg>
  );
};
