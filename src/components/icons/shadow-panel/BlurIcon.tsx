import { useScopedIds } from "../useScopedIds";

export const BlurIcon = () => {
  const ids = useScopedIds(["motionBlur"] as const);

  return (
  <svg width="20" height="20" viewBox="20 40 216 176">
    <defs>
      <filter id={ids.motionBlur} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>
    <circle cx="178" cy="128" r="54" fill="none" stroke="var(--icon-accent-blue-light)" strokeWidth="14" opacity="0.3" filter={`url(#${ids.motionBlur})`} />
    <circle cx="148" cy="128" r="54" fill="none" stroke="var(--icon-accent-blue-light)" strokeWidth="14" opacity="0.55" filter={`url(#${ids.motionBlur})`} />
    <circle cx="118" cy="128" r="54" fill="none" stroke="var(--icon-accent-blue)" strokeWidth="14" opacity="0.9" filter={`url(#${ids.motionBlur})`} />
    <circle cx="94" cy="128" r="58" fill="var(--icon-bg-primary)" stroke="var(--icon-stroke-dark)" strokeWidth="14" />
    <path d="M 94 85 Q 94 128 51 128 Q 94 128 94 171 Q 94 128 137 128 Q 94 128 94 85 Z" fill="var(--icon-accent-blue)" />
  </svg>
  );
};
