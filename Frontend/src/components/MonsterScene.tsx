"use client";

/**
 * Procedural "monster dungeon" backdrop for the game page in the Monster theme — no image
 * assets. Layers: a deep green-black cave gradient, a toxic glow pool, jagged rock
 * silhouettes top and bottom, and pairs of glowing eyes peering from the dark.
 */
export function MonsterScene() {
  const eyes = [
    { x: 12, y: 30 },
    { x: 84, y: 22 },
    { x: 70, y: 62 },
    { x: 24, y: 70 },
    { x: 92, y: 78 },
  ];
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 70% 50% at 50% 58%, rgba(47,174,90,0.22) 0%, transparent 60%)," +
          "radial-gradient(ellipse 120% 80% at 50% 120%, #123b22 0%, transparent 60%)," +
          "linear-gradient(180deg, #05100a 0%, #0a1a10 45%, #0c2416 100%)",
      }}
    >
      {/* glowing eyes lurking in the dark */}
      {eyes.map((e, i) => (
        <div
          key={i}
          className="monster-eyes-blink absolute flex gap-3"
          style={{ left: `${e.x}%`, top: `${e.y}%`, animationDelay: `${i * 0.9}s` }}
        >
          <span className="block h-6 w-6 rounded-full" style={{ background: "#ffd23f", boxShadow: "0 0 22px 7px rgba(255,210,63,0.85)" }} />
          <span className="block h-6 w-6 rounded-full" style={{ background: "#ffd23f", boxShadow: "0 0 22px 7px rgba(255,210,63,0.85)" }} />
        </div>
      ))}

      {/* jagged stalactites (top) */}
      <svg className="absolute inset-x-0 top-0 h-24 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0 0 H100 V6 L94 2 L88 9 L80 3 L72 11 L64 4 L55 10 L47 3 L38 12 L30 4 L22 9 L14 3 L7 8 L0 4 Z" fill="#071409" />
      </svg>
      {/* jagged rocks (bottom) */}
      <svg className="absolute inset-x-0 bottom-0 h-28 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0 20 H100 V12 L92 17 L84 9 L75 16 L66 10 L57 17 L48 9 L39 16 L30 10 L21 17 L12 10 L5 16 L0 11 Z" fill="#061007" />
      </svg>
    </div>
  );
}
