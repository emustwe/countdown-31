"use client";

/**
 * Original, hand-authored SVG monster — a green blob creature with horns, big glowing eyes,
 * and a fanged grin. No external/copyrighted art. Colors key off the theme so it fits the
 * Monster palette. Gently floats and blinks (unless reduced-motion is preferred).
 */
export function MonsterMascot({ size = 180, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`monster-float ${className}`}
      role="img"
      aria-label="Monster mascot"
    >
      <defs>
        <radialGradient id="mon-body" cx="42%" cy="35%" r="75%">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="#0c3b21" />
        </radialGradient>
        <radialGradient id="mon-eye" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fff6c2" />
          <stop offset="55%" stopColor="#ffd23f" />
          <stop offset="100%" stopColor="#e8891a" />
        </radialGradient>
        <filter id="mon-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* shadow */}
      <ellipse cx="100" cy="182" rx="52" ry="9" fill="rgba(0,0,0,0.28)" />

      {/* horns */}
      <path d="M55 55 C48 30 40 20 34 16 C44 22 58 32 66 48 Z" fill="#7a1f14" stroke="#4a1109" strokeWidth="2" />
      <path d="M145 55 C152 30 160 20 166 16 C156 22 142 32 134 48 Z" fill="#7a1f14" stroke="#4a1109" strokeWidth="2" />

      {/* body blob */}
      <path
        d="M100 40
           C143 40 168 70 168 108
           C168 150 140 176 100 176
           C60 176 32 150 32 108
           C32 70 57 40 100 40 Z"
        fill="url(#mon-body)"
        stroke="#0c3b21"
        strokeWidth="3"
      />

      {/* belly patch */}
      <path
        d="M100 96 C126 96 138 112 138 132 C138 154 122 166 100 166 C78 166 62 154 62 132 C62 112 74 96 100 96 Z"
        fill="#0c3b21"
        opacity="0.35"
      />

      {/* spots */}
      <circle cx="62" cy="72" r="7" fill="#0c3b21" opacity="0.4" />
      <circle cx="146" cy="86" r="5" fill="#0c3b21" opacity="0.4" />
      <circle cx="120" cy="60" r="4" fill="#0c3b21" opacity="0.4" />

      {/* eyes (blink) */}
      <g className="monster-blink" style={{ transformOrigin: "100px 96px" }}>
        <circle cx="78" cy="96" r="20" fill="#0a1a10" />
        <circle cx="122" cy="96" r="20" fill="#0a1a10" />
        <circle cx="78" cy="96" r="15" fill="url(#mon-eye)" filter="url(#mon-glow)" />
        <circle cx="122" cy="96" r="15" fill="url(#mon-eye)" filter="url(#mon-glow)" />
        {/* slit pupils */}
        <ellipse cx="78" cy="97" rx="4" ry="12" fill="#160a04" />
        <ellipse cx="122" cy="97" rx="4" ry="12" fill="#160a04" />
        {/* highlights */}
        <circle cx="72" cy="89" r="3.5" fill="#ffffff" opacity="0.9" />
        <circle cx="116" cy="89" r="3.5" fill="#ffffff" opacity="0.9" />
      </g>

      {/* angry brows */}
      <path d="M60 74 L94 84" stroke="#0c3b21" strokeWidth="5" strokeLinecap="round" />
      <path d="M140 74 L106 84" stroke="#0c3b21" strokeWidth="5" strokeLinecap="round" />

      {/* mouth with fangs */}
      <path d="M72 134 Q100 158 128 134 Q100 146 72 134 Z" fill="#160a04" />
      <path d="M80 136 L85 149 L90 137 Z" fill="#ffffff" />
      <path d="M120 136 L115 149 L110 137 Z" fill="#ffffff" />
      <path d="M100 140 L104 151 L96 151 Z" fill="#ffffff" />

      {/* little arms */}
      <path d="M34 118 C22 118 16 126 18 134 C24 130 30 130 36 132 Z" fill="url(#mon-body)" stroke="#0c3b21" strokeWidth="2" />
      <path d="M166 118 C178 118 184 126 182 134 C176 130 170 130 164 132 Z" fill="url(#mon-body)" stroke="#0c3b21" strokeWidth="2" />
    </svg>
  );
}
