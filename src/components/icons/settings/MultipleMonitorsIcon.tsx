import { useScopedIds } from "../useScopedIds";

export const MultipleMonitorsIcon = () => {
  const ids = useScopedIds(["gradient", "glow"] as const);

  return (
    <svg width="24" height="24" viewBox="0 0 500 500">
      <defs>
        <linearGradient id={ids.gradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--icon-accent-blue-light)" />
          <stop offset="100%" stopColor="var(--icon-accent-blue)" />
        </linearGradient>
        <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur1" />
          <feGaussianBlur stdDeviation="7" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${ids.glow})`}>
        {/* Dashed Capture Region - Centered and Taller */}
        <rect 
          x="130" y="110" width="240" height="240" rx="12" 
          stroke="var(--icon-accent-blue)" 
          strokeWidth="14" 
          strokeDasharray="40 25" 
          strokeLinecap="round"
          fill="none" 
          opacity="0.9"
        />

        {/* Monitors Group */}
        <g stroke={`url(#${ids.gradient})`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Left Monitor */}
          <g>
            <rect x="50" y="180" width="190" height="130" rx="18" fill="rgba(10, 15, 30, 0.4)" />
            <path d="M 145 310 L 145 340" strokeWidth="14" />
            <path d="M 110 345 L 180 345" strokeWidth="16" />
          </g>

          {/* Right Monitor */}
          <g>
            <rect x="260" y="180" width="190" height="130" rx="18" fill="rgba(10, 15, 30, 0.4)" />
            <path d="M 355 310 L 355 340" strokeWidth="14" />
            <path d="M 320 345 L 390 345" strokeWidth="16" />
          </g>
        </g>
      </g>
    </svg>
  );
};
