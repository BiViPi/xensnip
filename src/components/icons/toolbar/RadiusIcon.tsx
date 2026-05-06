import { useScopedIds } from "../useScopedIds";

export const RadiusIcon = () => {
  const ids = useScopedIds(["grad", "mountain", "glow"] as const);

  return (
  <svg width="24" height="24" viewBox="30 30 196 196" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={ids.grad} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-blue)" />
        <stop offset="100%" stopColor="var(--icon-accent-blue-light)" />
      </linearGradient>
      <linearGradient id={ids.mountain} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-purple-start)"/>
        <stop offset="100%" stopColor="var(--icon-accent-purple-end)"/>
      </linearGradient>
      <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="var(--icon-accent-blue)" floodOpacity="0.45" />
      </filter>
    </defs>
    <circle cx="88" cy="96" r="14" fill={`url(#${ids.mountain})`} />
    <path d="M 56 186 L 94 140 A 6 6 0 0 1 104 140 L 132 174 L 148 120 A 6 6 0 0 1 158 120 L 200 180 L 200 196 A 8 8 0 0 1 192 204 L 64 204 A 8 8 0 0 1 56 196 Z" fill={`url(#${ids.mountain})`} />
    <path d="M 128 44 L 76 44 A 32 32 0 0 0 44 76 L 44 180 A 32 32 0 0 0 76 212 L 180 212 A 32 32 0 0 0 212 180 L 212 128" fill="none" stroke="var(--icon-stroke-dark)" strokeWidth="12" strokeLinecap="round" />
    <path d="M 144 44 L 180 44 A 32 32 0 0 1 212 76 L 212 112" fill="none" stroke="var(--icon-accent-indigo)" strokeWidth="12" strokeLinecap="round" />
    <g fill="var(--icon-accent-indigo)"><circle cx="132" cy="60" r="4" /><circle cx="196" cy="124" r="4" /></g>
    <path d="M 140 60 A 56 56 0 0 1 196 116" fill="none" stroke="var(--icon-accent-indigo)" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 10" />
    <g transform="translate(192, 192)">
      <circle cx="0" cy="0" r="24" fill="var(--icon-bg-primary)" filter={`url(#${ids.glow})`} />
      <circle cx="0" cy="0" r="24" fill="var(--icon-bg-primary)" />
      <circle cx="0" cy="0" r="24" fill="none" stroke="var(--icon-accent-blue)" strokeWidth="4.5" />
      <path d="M -8 -4 A 10 10 0 0 1 6 6" fill="none" stroke="var(--icon-accent-blue)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M 6 -2 L 6 6 L -2 6" fill="none" stroke="var(--icon-accent-blue)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
  );
};
