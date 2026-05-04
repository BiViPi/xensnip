import React from 'react';
import { useScopedIds } from "../useScopedIds";

interface IconProps {
  size?: number;
  className?: string;
}

export const PrivacyIcon = ({ size = 20, className }: IconProps) => {
  const ids = useScopedIds(["grad", "mask"] as const);

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
        <linearGradient id={ids.grad} x1="220" y1="190" x2="800" y2="820" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--icon-accent-blue-light)" />
          <stop offset="100%" stopColor="var(--icon-accent-blue)" />
        </linearGradient>

        <mask id={ids.mask}>
          <rect x="0" y="0" width="1024" height="1024" fill="white" />
          <path d="M 580 350 Q 685 365 790 410 C 790 620, 700 740, 580 810 C 460 740, 370 620, 370 410 Q 475 365 580 350 Z"
            fill="black" stroke="black" strokeWidth="72" strokeLinejoin="round" />
        </mask>
      </defs>

      <g mask={`url(#${ids.mask})`}>
        <rect x="250" y="220" width="460" height="380" rx="40" stroke={`url(#${ids.grad})`} strokeWidth="48" />
        <path d="M 226 335 L 226 260 A 64 64 0 0 1 290 196 L 670 196 A 64 64 0 0 1 734 260 L 734 335 Z" fill={`url(#${ids.grad})`} />
      </g>

      <path d="M 580 350 Q 685 365 790 410 C 790 620, 700 740, 580 810 C 460 740, 370 620, 370 410 Q 475 365 580 350 Z"
        stroke={`url(#${ids.grad})`} strokeWidth="48" strokeLinejoin="round" />

      <path d="M 605 551 A 40 40 0 1 0 555 551 L 535 638 A 12 12 0 0 0 547 650 L 613 650 A 12 12 0 0 0 625 638 Z"
        fill={`url(#${ids.grad})`} />
    </svg>
  );
};
