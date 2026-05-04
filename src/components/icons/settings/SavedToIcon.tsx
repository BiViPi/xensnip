import { useScopedIds } from "../useScopedIds";

export const SavedToIcon = () => {
  const ids = useScopedIds(["gradient", "glow"] as const);

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
    </defs>
    <g filter={`url(#${ids.glow})`} fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 56 100 L 56 80 A 16 16 0 0 1 72 64 L 100 64 L 120 84 L 184 84 A 16 16 0 0 1 200 100 L 200 176 A 16 16 0 0 1 184 192 L 72 192 A 16 16 0 0 1 56 176 Z" />
      <path d="M 56 100 L 104 100 L 124 120 L 200 120" />
    </g>
  </svg>
  );
};
