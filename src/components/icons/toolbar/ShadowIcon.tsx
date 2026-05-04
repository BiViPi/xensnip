import { useScopedIds } from "../useScopedIds";

export const ShadowIcon = () => {
  const ids = useScopedIds(["stroke", "fill"] as const);

  return (
  <svg width="24" height="24" viewBox="40 40 176 176">
    <defs>
      <linearGradient id={ids.stroke} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-blue)" stopOpacity="0" />
        <stop offset="35%" stopColor="var(--icon-accent-blue)" stopOpacity="0" />
        <stop offset="65%" stopColor="var(--icon-accent-blue)" stopOpacity="1" />
        <stop offset="100%" stopColor="var(--icon-accent-blue)" stopOpacity="1" />
      </linearGradient>
      <linearGradient id={ids.fill} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-blue-light)" stopOpacity="0" />
        <stop offset="40%" stopColor="var(--icon-accent-blue-light)" stopOpacity="0.05" />
        <stop offset="100%" stopColor="var(--icon-accent-blue-light)" stopOpacity="0.3" />
      </linearGradient>
    </defs>
    <rect x="104" y="104" width="104" height="104" rx="24" fill={`url(#${ids.fill})`} stroke={`url(#${ids.stroke})`} strokeWidth="10" />
    <path d="M 120 80 L 160 80 A 24 24 0 0 1 184 104 L 184 160 A 24 24 0 0 1 160 184 L 104 184 A 24 24 0 0 1 80 160 L 80 120 Z" fill="var(--icon-bg-primary)" />
    <path d="M 120 80 L 160 80 A 24 24 0 0 1 184 104 L 184 160 A 24 24 0 0 1 160 184 L 104 184 A 24 24 0 0 1 80 160 L 80 120" fill="none" stroke="var(--icon-stroke-dark)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 80 48 Q 80 80 48 80 Q 80 80 80 112 Q 80 80 112 80 Q 80 80 80 48 Z" fill="var(--icon-accent-blue)" />
  </svg>
  );
};
