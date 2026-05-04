import { useScopedIds } from "../useScopedIds";

export const LaunchOnStartupIcon = () => {
  const ids = useScopedIds(["gradient", "glow", "mask"] as const);

  return (
  <svg width="24" height="24" viewBox="0 0 256 256">
    <defs>
      <linearGradient id={ids.gradient} x1="0" y1="40" x2="0" y2="220" gradientUnits="userSpaceOnUse">
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
        <rect x="0" y="0" width="256" height="256" fill="#FFFFFF" />
        <circle cx="188" cy="164" r="46" fill="#000000" />
      </mask>
    </defs>
    <g filter={`url(#${ids.glow})`}>
      <g fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <rect x="40" y="56" width="176" height="128" rx="24" mask={`url(#${ids.mask})`} />
        <path d="M 128 184 L 128 214" />
        <path d="M 100 214 L 156 214" />
        <path d="M 128 84 L 128 120" />
        <path d="M 106 106 A 30 30 0 1 0 150 106" />
      </g>
      <circle cx="188" cy="164" r="32" fill={`url(#${ids.gradient})`} />
    </g>
    <path d="M 172 164 L 184 176 L 206 150" fill="none" stroke="var(--icon-bg-card)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
  );
};
