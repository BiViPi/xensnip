import { useScopedIds } from "../useScopedIds";

export const IconSoundIcon = () => {
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
      <path d="M 82 152 L 66 152 A 12 12 0 0 1 54 140 L 54 116 A 12 12 0 0 1 66 104 L 82 104 L 116 64 A 8 8 0 0 1 130 70 L 130 186 A 8 8 0 0 1 116 192 Z" />
      <path d="M 154 104 A 40 40 0 0 1 154 152" />
      <path d="M 178 84 A 70 70 0 0 1 178 172" />
      <path d="M 202 64 A 100 100 0 0 1 202 192" />
    </g>
  </svg>
  );
};
