import { useScopedIds } from "../useScopedIds";

export const BackgroundIcon = () => {
  const ids = useScopedIds(["gradWin", "gradImg", "glow", "shadow", "clipWin", "clipImg"] as const);

  return (
  <svg width="24" height="24" viewBox="70 90 340 305" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={ids.gradWin} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B70FF" />
        <stop offset="50%" stopColor="#C552FF" />
        <stop offset="100%" stopColor="var(--icon-accent-orange)" />
      </linearGradient>
      <linearGradient id={ids.gradImg} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6CA1FF" />
        <stop offset="100%" stopColor="#2464F1" />
      </linearGradient>
      <filter id={ids.glow} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="16" />
      </filter>
      <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="15" stdDeviation="18" floodColor="#0A1E40" floodOpacity="0.25" />
      </filter>
      <clipPath id={ids.clipWin}><rect x="110" y="100" width="290" height="210" rx="24" /></clipPath>
      <clipPath id={ids.clipImg}><rect x="110" y="270" width="110" height="95" rx="12" /></clipPath>
    </defs>
    <rect x="110" y="100" width="290" height="210" rx="24" fill={`url(#${ids.gradWin})`} filter={`url(#${ids.glow})`} opacity="0.65" />
    <rect x="110" y="100" width="290" height="210" rx="24" fill={`url(#${ids.gradWin})`} />
    <path d="M 110 220 Q 200 160 300 240 T 400 150 L 400 310 L 110 310 Z" fill="var(--icon-bg-primary)" opacity="0.15" clipPath={`url(#${ids.clipWin})`} />
    <rect x="110" y="100" width="290" height="210" rx="24" fill="none" stroke="var(--icon-stroke-medium)" strokeWidth="10" />
    <rect x="80" y="210" width="260" height="175" rx="20" fill="var(--icon-bg-primary)" stroke="var(--icon-stroke-medium)" strokeWidth="10" filter={`url(#${ids.shadow})`} />
    <circle cx="115" cy="240" r="7" fill="#FF5F5A" />
    <circle cx="138" cy="240" r="7" fill="#FFBC2E" />
    <circle cx="161" cy="240" r="7" fill="#28CA42" />
    <rect x="250" y="237" width="65" height="7" rx="3.5" fill="#D3DBE8" />
    <rect x="110" y="270" width="110" height="95" rx="12" fill={`url(#${ids.gradImg})`} />
    <g clipPath={`url(#${ids.clipImg})`}>
      <circle cx="185" cy="295" r="11" fill="#E2EDFF" opacity="0.9" />
      <polygon points="85,380 145,305 205,380" fill="#1C52D2" />
      <polygon points="140,380 190,325 240,380" fill="#3676FF" />
    </g>
    <rect x="240" y="275" width="85" height="8" rx="4" fill="#D3DBE8" />
    <rect x="240" y="300" width="85" height="8" rx="4" fill="#D3DBE8" />
    <rect x="240" y="325" width="65" height="8" rx="4" fill="#D3DBE8" />
    <rect x="240" y="350" width="38" height="8" rx="4" fill="#D3DBE8" />
  </svg>
  );
};
