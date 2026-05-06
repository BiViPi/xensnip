import { useScopedIds } from "../useScopedIds";

export const RatioIcon = () => {
  const ids = useScopedIds(["grad", "shadow"] as const);

  return (
  <svg width="24" height="24" viewBox="80 100 310 270" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={ids.grad} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-indigo)" />
        <stop offset="100%" stopColor="var(--icon-accent-indigo-light)" />
      </linearGradient>
      <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="15" floodColor="#0A1E40" floodOpacity="0.12" />
      </filter>
    </defs>
    <rect x="210" y="110" width="170" height="250" rx="24" fill="var(--icon-bg-primary)" stroke="var(--icon-stroke-medium)" strokeWidth="14" filter={`url(#${ids.shadow})`} />
    <rect x="90" y="200" width="250" height="160" rx="28" fill="var(--icon-bg-primary)" stroke="var(--icon-accent-indigo)" strokeWidth="16" filter={`url(#${ids.shadow})`} />
    <g stroke="var(--icon-accent-indigo)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1="175" y1="320" x2="255" y2="240" />
      <polyline points="225,240 255,240 255,270" />
      <polyline points="205,320 175,320 175,290" />
    </g>
  </svg>
  );
};
