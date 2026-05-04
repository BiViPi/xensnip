import { useScopedIds } from "../useScopedIds";

export const OutputFormatIcon = () => {
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
        <rect x="132" y="32" width="108" height="104" rx="24" fill="#000000" />
      </mask>
    </defs>
    <g filter={`url(#${ids.glow})`}>
      <g mask={`url(#${ids.mask})`} fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <rect x="40" y="64" width="160" height="144" rx="24" />
        <circle cx="80" cy="96" r="12" />
        <path d="M 40 184 L 92 132 L 128 168 L 164 132 L 200 168" />
      </g>
      <rect x="144" y="44" width="84" height="80" rx="16" fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="12" strokeLinejoin="round" />
      <text x="186" y="74" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="20" fill={`url(#${ids.gradient})`} style={{ letterSpacing: '0.5px' }}>PNG</text>
      <text x="186" y="100" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="20" fill={`url(#${ids.gradient})`} style={{ letterSpacing: '0.5px' }}>JPEG</text>
    </g>
  </svg>
  );
};
