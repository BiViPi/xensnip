import { useScopedIds } from "../useScopedIds";

interface IconProps {
  size?: number;
  className?: string;
}

export const FocusPolishIcon = ({ size = 20, className }: IconProps) => {
  const ids = useScopedIds(["grad"] as const);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={ids.grad} x1="150" y1="870" x2="870" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--icon-accent-blue-light)" />
          <stop offset="100%" stopColor="var(--icon-accent-blue)" />
        </linearGradient>
      </defs>

      <g transform="translate(410, 630) rotate(-45)" fill={`url(#${ids.grad})`}>
        <path d="M -160 -60 
                 L 90 -60 
                 L 90 60 
                 L -160 60 
                 A 60 60 0 0 1 -160 -60 Z" />

        <path d="M 120 -60 
                 L 160 -60 
                 A 60 60 0 0 1 160 60 
                 L 120 60 Z" />
      </g>

      <path d="M 680 260 
               Q 680 360 780 360 
               Q 680 360 680 460 
               Q 680 360 580 360 
               Q 680 360 680 260 Z"
        fill={`url(#${ids.grad})`}
        stroke={`url(#${ids.grad})`}
        strokeWidth="40"
        strokeLinejoin="round" />

      <rect x="565" y="185" width="30" height="70" rx="15" fill={`url(#${ids.grad})`} />
      <rect x="785" y="445" width="70" height="30" rx="15" fill={`url(#${ids.grad})`} />
    </svg>
  );
};
