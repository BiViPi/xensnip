import { useScopedIds } from "../useScopedIds";

export const PresetIcon = () => {
  const ids = useScopedIds([
    "edgeHighlight", "bgCard1", "bgCard2", "sliderFill1", "sliderFill2", "sliderFill3",
    "knob1", "knob2", "knob3", "bookmarkGrad"
  ] as const);

  return (
  <svg width="24" height="24" viewBox="65 60 270 270" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={ids.edgeHighlight} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="1.0"/>
        <stop offset="20%" stopColor="#ffffff" stopOpacity="0.4"/>
        <stop offset="60%" stopColor="#ffffff" stopOpacity="0.0"/>
        <stop offset="100%" stopColor="#000000" stopOpacity="0.3"/>
      </linearGradient>
      <linearGradient id={ids.bgCard1} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9358ff"/>
        <stop offset="50%" stopColor="#ff66c4"/>
        <stop offset="100%" stopColor="#ff9b5e"/>
      </linearGradient>
      <linearGradient id={ids.bgCard2} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6e50ff"/>
        <stop offset="50%" stopColor="#d147ff"/>
        <stop offset="100%" stopColor="#ff549a"/>
      </linearGradient>
      <linearGradient id={ids.sliderFill1} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#647eff"/>
        <stop offset="100%" stopColor="#b875ff"/>
      </linearGradient>
      <linearGradient id={ids.sliderFill2} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#c144ff"/>
        <stop offset="100%" stopColor="#ff548e"/>
      </linearGradient>
      <linearGradient id={ids.sliderFill3} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ff8b3d"/>
        <stop offset="100%" stopColor="#ffc14d"/>
      </linearGradient>
      <radialGradient id={ids.knob1} cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#d2b3ff"/>
        <stop offset="40%" stopColor="#a66cff"/>
        <stop offset="100%" stopColor="#5522d9"/>
      </radialGradient>
      <radialGradient id={ids.knob2} cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffb3ce"/>
        <stop offset="40%" stopColor="#ff5c99"/>
        <stop offset="100%" stopColor="#d12065"/>
      </radialGradient>
      <radialGradient id={ids.knob3} cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffdcb3"/>
        <stop offset="40%" stopColor="#ff9e40"/>
        <stop offset="100%" stopColor="#c2570e"/>
      </radialGradient>
      <linearGradient id={ids.bookmarkGrad} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#5e8cff"/>
        <stop offset="100%" stopColor="#1935c9"/>
      </linearGradient>
    </defs>
    <g>
      <rect x="130" y="60" width="170" height="170" rx="30" fill={`url(#${ids.bgCard1})`}/>
      <rect x="131" y="61" width="168" height="168" rx="29" fill="none" stroke={`url(#${ids.edgeHighlight})`} strokeWidth="2"/>
    </g>
    <g>
      <rect x="100" y="90" width="170" height="170" rx="30" fill={`url(#${ids.bgCard2})`}/>
      <rect x="101" y="91" width="168" height="168" rx="29" fill="none" stroke={`url(#${ids.edgeHighlight})`} strokeWidth="2"/>
    </g>
    <g>
      <rect x="70" y="120" width="180" height="180" rx="30" fill="var(--icon-bg-primary)"/> {/* sau này khi làm light theme thì panel này chuyển lại nền đen */}
      <rect x="71" y="121" width="178" height="178" rx="29" fill="none" stroke={`url(#${ids.edgeHighlight})`} strokeWidth="2"/>
    </g>
    <g id="ui-elements-preset">
      <g id="row-1-preset">
        <path d="M 95 158 L 90 158 L 90 163 M 90 167 L 90 172 L 95 172 M 105 158 L 110 158 L 110 163 M 110 167 L 110 172 L 105 172" fill="none" stroke="#8c77ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="135" y="162" width="90" height="6" rx="3" fill="var(--icon-bg-card)"/>
        <rect x="135" y="162" width="60" height="6" rx="3" fill={`url(#${ids.sliderFill1})`}/>
        <circle cx="195" cy="165" r="9.5" fill={`url(#${ids.knob1})`}/>
      </g>
      <g id="row-2-preset">
        <rect x="90" y="210" width="20" height="16" rx="3.5" fill="none" stroke="#d56cff" strokeWidth="2.5" strokeLinejoin="round"/>
        <circle cx="96" cy="215" r="2.5" fill="#d56cff"/>
        <path d="M 90 224 L 97 217 L 101 221 L 105 216 L 110 222" fill="none" stroke="#d56cff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="135" y="212" width="90" height="6" rx="3" fill="var(--icon-bg-card)"/>
        <rect x="135" y="212" width="45" height="6" rx="3" fill={`url(#${ids.sliderFill2})`}/>
        <circle cx="180" cy="215" r="9.5" fill={`url(#${ids.knob2})`}/>
      </g>
      <g id="row-3-preset">
        <rect x="91" y="261" width="18" height="18" rx="4" fill="none" stroke="#ff9f4a" strokeWidth="2.5" strokeDasharray="5 4.5" strokeDashoffset="1" strokeLinecap="round"/>
        <rect x="135" y="267" width="90" height="6" rx="3" fill="var(--icon-bg-card)"/>
        <rect x="135" y="267" width="30" height="6" rx="3" fill={`url(#${ids.sliderFill3})`}/>
        <circle cx="165" cy="270" r="9.5" fill={`url(#${ids.knob3})`}/>
      </g>
    </g>
    <g id="bookmark-group-preset">
      <path d="M 215 255 Q 210 255 210 260 L 210 330 L 237.5 310 L 265 330 L 265 260 Q 265 255 260 255 Z" fill={`url(#${ids.bookmarkGrad})`}/>
      <path d="M 215 256 Q 211 256 211 261 L 211 327 L 237.5 309 L 264 327 L 264 261 Q 264 256 260 256 Z" fill="none" stroke={`url(#${ids.edgeHighlight})`} strokeWidth="1.5"/>
      <path d="M 237.5 272 L 240.5 280 L 248.5 281 L 242 286 L 244 294 L 237.5 289.5 L 231 294 L 233 286 L 226.5 281 L 234.5 280 Z" fill="#f0f5ff" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round"/>
    </g>
  </svg>
  );
};
