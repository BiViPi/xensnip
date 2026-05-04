import { useScopedIds } from "../useScopedIds";

export const AngleIcon = () => {
  const ids = useScopedIds(["arc", "arrow"] as const);

  return (
  <svg width="20" height="20" viewBox="20 50 216 176">
    <defs>
      <linearGradient id={ids.arc} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-blue-light)" />
        <stop offset="100%" stopColor="var(--icon-accent-blue)" />
      </linearGradient>
      <linearGradient id={ids.arrow} x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--icon-accent-blue)" />
        <stop offset="100%" stopColor="var(--icon-accent-blue-light)" />
      </linearGradient>
    </defs>
    <path d="M 98 140 A 75 75 0 0 0 128 200" fill="none" stroke={`url(#${ids.arc})`} strokeWidth="16" />
    <path d="M 143 80 L 53 200 L 203 200" fill="none" stroke="var(--icon-stroke-dark)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
    <g transform="translate(143, 80) rotate(-53.13)">
      <path d="M 42 0 L -8 20 L 8 0 L -8 -20 Z" fill={`url(#${ids.arrow})`} stroke={`url(#${ids.arrow})`} strokeWidth="2" strokeLinejoin="round" />
    </g>
    <path d="M 157 126 Q 157 150 133 150 Q 157 150 157 174 Q 157 150 181 150 Q 157 150 157 126 Z" fill="var(--icon-accent-blue-light)" />
  </svg>
  );
};
