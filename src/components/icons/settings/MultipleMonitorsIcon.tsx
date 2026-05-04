import { useScopedIds } from "../useScopedIds";

export const MultipleMonitorsIcon = () => {
  const ids = useScopedIds(["gradient", "glow", "monitorCutout", "pointerCutout"] as const);

  return (
  <svg width="24" height="24" viewBox="0 0 500 500">
    <defs>
      <linearGradient id={ids.gradient} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--icon-accent-blue-light)" />
        <stop offset="100%" stopColor="var(--icon-accent-blue)" />
      </linearGradient>
      <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="blur1" />
        <feGaussianBlur stdDeviation="7" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <mask id={ids.monitorCutout}>
        <rect width="100%" height="100%" fill="white" />
        <rect x="180" y="175" width="140" height="100" fill="black" />
        <path d="M 320 265 L 320 315 L 331 305 L 343 330 L 353 325 L 341 300 L 355 300 Z" fill="black" stroke="black" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
      </mask>
      <mask id={ids.pointerCutout}>
        <rect width="100%" height="100%" fill="white" />
        <path d="M 320 265 L 320 315 L 331 305 L 343 330 L 353 325 L 341 300 L 355 300 Z" fill="black" stroke="black" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
      </mask>
    </defs>
    <g filter={`url(#${ids.glow})`}>
      <g mask={`url(#${ids.monitorCutout})`}>
        <g stroke={`url(#${ids.gradient})`} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <rect x="95" y="155" width="150" height="135" rx="15" />
          <path d="M 155 290 L 155 320 M 185 290 L 185 320" />
          <path d="M 140 325 L 200 325" strokeWidth="10" />
        </g>
        <g stroke={`url(#${ids.gradient})`} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <rect x="255" y="155" width="150" height="135" rx="15" />
          <path d="M 315 290 L 315 320 M 345 290 L 345 320" />
          <path d="M 300 325 L 360 325" strokeWidth="10" />
        </g>
      </g>
      <g mask={`url(#${ids.pointerCutout})`} stroke={`url(#${ids.gradient})`} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 180 195 L 180 175 L 200 175" />
        <path d="M 300 175 L 320 175 L 320 195" />
        <path d="M 180 255 L 180 275 L 200 275" />
        <path d="M 300 275 L 320 275 L 320 255" />
        <path d="M 215 175 L 230 175 M 245 175 L 260 175 M 275 175 L 290 175" />
        <path d="M 215 275 L 230 275 M 245 275 L 260 275 M 275 275 L 290 275" />
        <path d="M 180 205 L 180 220 M 180 230 L 180 245" />
        <path d="M 320 205 L 320 220 M 320 230 L 320 245" />
      </g>
      <path d="M 320 265 L 320 315 L 331 305 L 343 330 L 353 325 L 341 300 L 355 300 Z" fill="none" stroke={`url(#${ids.gradient})`} strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  </svg>
  );
};
