import { useScopedIds } from "../useScopedIds";

export const OpacityIcon = () => {
  const ids = useScopedIds(["slider"] as const);

  return (
  <svg width="20" height="20" viewBox="20 20 216 216">
    <defs>
      <linearGradient id={ids.slider} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="var(--icon-accent-blue)" />
        <stop offset="100%" stopColor="var(--icon-accent-blue-light)" />
      </linearGradient>
    </defs>
    <circle cx="98" cy="120" r="38" fill="var(--icon-accent-blue)" fillOpacity="0.1" />
    <circle cx="128" cy="120" r="38" fill="var(--icon-accent-blue)" fillOpacity="0.35" />
    <circle cx="158" cy="120" r="38" fill="var(--icon-accent-blue)" fillOpacity="0.85" />
    <path d="M 56 176 A 96 96 0 0 1 154 36" fill="none" stroke="var(--icon-stroke-dark)" strokeWidth="12" strokeLinecap="round" />
    <path d="M 194 66 A 96 96 0 0 1 200 176" fill="none" stroke="var(--icon-stroke-dark)" strokeWidth="12" strokeLinecap="round" />
    <path d="M 174 28 Q 174 52 150 52 Q 174 52 174 76 Q 174 52 198 52 Q 174 52 174 28 Z" fill="var(--icon-accent-blue)" />
    <path d="M 76 196 L 114 196" fill="none" stroke="var(--icon-stroke-dark)" strokeWidth="12" strokeLinecap="round" />
    <path d="M 142 196 L 180 196" fill="none" stroke={`url(#${ids.slider})`} strokeWidth="12" strokeLinecap="round" />
    <circle cx="128" cy="196" r="14" fill="var(--icon-bg-primary)" stroke="var(--icon-stroke-dark)" strokeWidth="12" />
    <path d="M 123 198 A 5 5 0 0 0 133 198" fill="none" stroke="var(--icon-accent-blue)" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
  );
};
