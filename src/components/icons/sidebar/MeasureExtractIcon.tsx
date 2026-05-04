import React from 'react';
import { useScopedIds } from "../useScopedIds";

interface IconProps {
  size?: number;
  className?: string;
}

export const MeasureExtractIcon = ({ size = 20, className }: IconProps) => {
  const ids = useScopedIds(["grad", "gridMask", "rulerMask"] as const);

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
        <linearGradient id={ids.grad} x1="150" y1="870" x2="870" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        <mask id={ids.gridMask}>
          <rect x="0" y="0" width="1024" height="1024" fill="white" />
          <rect x="-202" y="-82" width="404" height="164" rx="47" transform="translate(380, 600) rotate(-45)" fill="black" />
        </mask>

        <mask id={ids.rulerMask}>
          <rect x="-190" y="-70" width="380" height="140" rx="35" fill="white" />
          <rect x="20" y="35" width="24" height="70" rx="12" fill="black" />
          <rect x="80" y="35" width="24" height="70" rx="12" fill="black" />
          <rect x="140" y="35" width="24" height="70" rx="12" fill="black" />
        </mask>
      </defs>

      <g mask={`url(#${ids.gridMask})`} stroke={`url(#${ids.grad})`} strokeWidth="32" strokeLinecap="round">
        <path d="M 295 360 L 695 360" />
        <path d="M 295 560 L 695 560" />
        <path d="M 395 260 L 395 660" />
        <path d="M 595 260 L 595 660" />
      </g>

      <g transform="translate(380, 600) rotate(-45)">
        <rect x="-190" y="-70" width="380" height="140" rx="35" fill={`url(#${ids.grad})`} mask={`url(#${ids.rulerMask})`} />
      </g>

      <g transform="translate(700, 730) rotate(-45)" fill={`url(#${ids.grad})`}>
        <rect x="50" y="-30" width="70" height="60" rx="30" />
        <rect x="25" y="-40" width="30" height="80" rx="15" />
        <path d="M 28 -25 L 28 25 L -50 15 L -50 -15 Z" />
        <path d="M -48 -8 L -48 8 L -68 8 A 8 8 0 0 1 -68 -8 Z" />
      </g>
    </svg>
  );
};
