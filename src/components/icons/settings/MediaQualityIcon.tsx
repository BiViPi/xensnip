import { useScopedIds } from "../useScopedIds";

export const MediaQualityIcon = () => {
  const ids = useScopedIds(["gradient", "glow", "mask"] as const);

  return (
  <svg width="24" height="24" viewBox="0 0 256 256">
    <defs>
      <linearGradient id={ids.gradient} x1="0" y1="40" x2="0" y2="216" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="var(--icon-accent-blue-light)" />
        <stop offset="100%" stopColor="var(--icon-accent-blue)" />
      </linearGradient>
      <filter id={ids.glow} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <mask id={ids.mask}>
        <rect width="256" height="256" fill="#FFFFFF" />
        <circle cx="180" cy="180" r="54" fill="#000000" />
      </mask>
    </defs>
    <g filter={`url(#${ids.glow})`}>
      <g mask={`url(#${ids.mask})`} fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <rect x="40" y="40" width="176" height="176" rx="32" />
        <rect x="76" y="76" width="104" height="104" rx="16" />
        <circle cx="106" cy="106" r="10" fill={`url(#${ids.gradient})`} stroke="none" />
        <path d="M 76 164 L 104 136 L 128 160 L 154 132 L 180 158" />
      </g>
      <g fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 180 140 A 40 40 0 1 0 220 180" />
        <path d="M 180 140 A 40 40 0 0 1 220 180" strokeDasharray="1 19.9" />
      </g>
      <text x="180" y="186" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="22" fill={`url(#${ids.gradient})`} style={{ letterSpacing: '0.5px' }}>100%</text>
    </g>
  </svg>
  );
};
