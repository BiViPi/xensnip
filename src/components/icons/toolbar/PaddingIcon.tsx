import { useScopedIds } from "../useScopedIds";

export const PaddingIcon = () => {
  const ids = useScopedIds(["grad", "shadow", "arrow"] as const);

  return (
  <svg width="24" height="24" viewBox="60 60 380 380" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={ids.grad} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-purple-start)" />
        <stop offset="100%" stopColor="var(--icon-accent-purple-end)" />
      </linearGradient>
      <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="15" floodColor="#26225f" floodOpacity="0.22" />
      </filter>
      <g id={ids.arrow}>
        <line x1="250" y1="80" x2="250" y2="135" fill="none" stroke={`url(#${ids.grad})`} strokeWidth="12" strokeLinecap="round" />
        <polyline points="233,97 250,80 267,97" fill="none" stroke={`url(#${ids.grad})`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="233,118 250,135 267,118" fill="none" stroke={`url(#${ids.grad})`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </defs>
    <rect x="70" y="70" width="360" height="360" rx="48" fill="none" stroke={`url(#${ids.grad})`} strokeWidth="10" strokeLinecap="round" strokeDasharray="22 28" />
    <use href={`#${ids.arrow}`} />
    <use href={`#${ids.arrow}`} transform="rotate(90 250 250)" />
    <use href={`#${ids.arrow}`} transform="rotate(180 250 250)" />
    <use href={`#${ids.arrow}`} transform="rotate(270 250 250)" />
    <rect x="155" y="155" width="190" height="190" rx="28" fill="#F2F6FF" stroke="#161E36" strokeWidth="14" filter={`url(#${ids.shadow})`} />
  </svg>
  );
};
