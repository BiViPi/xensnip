import { useScopedIds } from "../useScopedIds";

export const OffsetIcon = () => {
  const ids = useScopedIds(["bgScale"] as const);

  return (
  <svg width="20" height="20" viewBox="20 40 216 176">
    <defs>
      <linearGradient id={ids.bgScale} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-blue-light)" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="var(--icon-accent-blue-light)" stopOpacity="0.8"/>
      </linearGradient>
    </defs>
    <rect x="88" y="92" width="128" height="100" rx="16" fill={`url(#${ids.bgScale})`} />
    <g stroke="var(--icon-accent-blue)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M 175 160 L 215 190" />
      <path d="M 175 172 L 175 160 L 187 160" />
      <path d="M 203 190 L 215 190 L 215 178" />
    </g>
    <rect x="44" y="60" width="128" height="96" rx="16" fill="var(--icon-bg-primary)" stroke="var(--icon-stroke-medium)" strokeWidth="12" />
  </svg>
  );
};
