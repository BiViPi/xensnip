import { useScopedIds } from "../useScopedIds";

export const ExportSoundIcon = () => {
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
        <g fill="#000000" stroke="#000000" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 140 156 L 132 156 A 6 6 0 0 0 126 162 L 126 182 A 6 6 0 0 0 132 188 L 140 188 L 162 206 A 6 6 0 0 0 172 201 L 172 143 A 6 6 0 0 0 162 138 Z" />
          <path d="M 188 156 A 16 16 0 0 1 188 188" />
          <path d="M 204 140 A 32 32 0 0 1 204 204" />
        </g>
      </mask>
    </defs>
    <g filter={`url(#${ids.glow})`}>
      <g mask={`url(#${ids.mask})`} fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 72 44 L 152 44 L 200 92 L 200 196 A 16 16 0 0 1 184 212 L 72 212 A 16 16 0 0 1 56 196 L 56 60 A 16 16 0 0 1 72 44 Z" />
        <path d="M 92 44 L 92 84 A 8 8 0 0 0 100 92 L 132 92 A 8 8 0 0 0 140 84 L 140 44" />
        <rect x="116" y="56" width="12" height="16" rx="4" fill={`url(#${ids.gradient})`} stroke="none" />
        <path d="M 84 212 L 84 140 A 12 12 0 0 1 96 128 L 160 128 A 12 12 0 0 1 172 140 L 172 212" />
        <path d="M 104 160 L 132 160" />
        <path d="M 104 184 L 152 184" />
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M 140 156 L 132 156 A 6 6 0 0 0 126 162 L 126 182 A 6 6 0 0 0 132 188 L 140 188 L 162 206 A 6 6 0 0 0 172 201 L 172 143 A 6 6 0 0 0 162 138 Z" fill={`url(#${ids.gradient})`} />
        <g fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="10">
          <path d="M 188 156 A 16 16 0 0 1 188 188" />
          <path d="M 204 140 A 32 32 0 0 1 204 204" />
        </g>
      </g>
    </g>
  </svg>
  );
};
