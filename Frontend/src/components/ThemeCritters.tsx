"use client";

/* Original, lightweight SVG decorations for the home backdrop — several DISTINCT shapes per
   theme (not one repeated image), scattered semi-transparently and gently drifting. */

function Ghost({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path d="M12 30a20 20 0 0 1 40 0v26l-7-6-7 6-6-6-6 6-7-6z" fill="#39d06f" />
      <circle cx="25" cy="30" r="4" fill="#0a1a10" />
      <circle cx="39" cy="30" r="4" fill="#0a1a10" />
    </svg>
  );
}
function Cyclops({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <circle cx="32" cy="30" r="22" fill="#2f9e4f" />
      <circle cx="32" cy="28" r="11" fill="#ffe27a" />
      <circle cx="32" cy="28" r="4.5" fill="#160a04" />
      <path d="M22 44 l5 8 M42 44 l-5 8" stroke="#0c3b21" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 40 q8 8 16 0" stroke="#0a1a10" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function Slime({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path d="M8 44c0-14 10-22 24-22s24 8 24 22c0 6-4 8-10 8H18C12 52 8 50 8 44z" fill="#46d178" />
      <circle cx="26" cy="38" r="3.5" fill="#0a1a10" />
      <circle cx="40" cy="38" r="3.5" fill="#0a1a10" />
      <circle cx="20" cy="58" r="3" fill="#46d178" />
      <circle cx="46" cy="58" r="2.4" fill="#46d178" />
    </svg>
  );
}
function Bat({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path d="M32 24c-6-10-14-8-18-4 4 0 4 4 2 8 6-2 10 0 16 4 6-4 10-6 16-4-2-4-2-8 2-8-4-4-12-6-18 4z" fill="#7a1f14" />
      <circle cx="32" cy="30" r="8" fill="#c0392b" />
      <circle cx="29" cy="29" r="1.6" fill="#ffe27a" />
      <circle cx="35" cy="29" r="1.6" fill="#ffe27a" />
    </svg>
  );
}

function Coin({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="26" fill="#e8c766" stroke="#a9781a" strokeWidth="3" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#a9781a" strokeWidth="2" />
      <path d="M32 20l3.5 8.5L44 30l-6.5 6 1.6 9L32 40l-7 5 1.6-9L20 30l8.5-1.5z" fill="#a9781a" />
    </svg>
  );
}
function Moon({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path d="M40 8a26 26 0 1 0 16 44A22 22 0 0 1 40 8z" fill="#f2e2b0" />
    </svg>
  );
}
function Sparkle({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path d="M32 6l6 20 20 6-20 6-6 20-6-20-20-6 20-6z" fill="#e8c766" />
    </svg>
  );
}

type Item = { C: (p: { s: number }) => React.ReactElement; s: number; left: string; top: string; op: number; anim: string; delay: string };

const MONSTER: Item[] = [
  { C: Ghost, s: 120, left: "6%", top: "18%", op: 0.16, anim: "drift-a", delay: "0s" },
  { C: Cyclops, s: 150, left: "80%", top: "12%", op: 0.14, anim: "drift-b", delay: "1.2s" },
  { C: Slime, s: 170, left: "72%", top: "62%", op: 0.15, anim: "drift-a", delay: "2s" },
  { C: Bat, s: 110, left: "14%", top: "64%", op: 0.18, anim: "drift-b", delay: "0.6s" },
  { C: Ghost, s: 90, left: "44%", top: "74%", op: 0.12, anim: "drift-a", delay: "1.6s" },
  { C: Bat, s: 80, left: "52%", top: "10%", op: 0.13, anim: "drift-b", delay: "2.4s" },
];

const DESERT: Item[] = [
  { C: Coin, s: 120, left: "8%", top: "20%", op: 0.18, anim: "drift-a", delay: "0s" },
  { C: Sparkle, s: 90, left: "82%", top: "16%", op: 0.16, anim: "drift-b", delay: "1s" },
  { C: Moon, s: 150, left: "76%", top: "60%", op: 0.14, anim: "drift-a", delay: "1.8s" },
  { C: Coin, s: 90, left: "16%", top: "66%", op: 0.16, anim: "drift-b", delay: "0.8s" },
  { C: Sparkle, s: 70, left: "46%", top: "74%", op: 0.14, anim: "drift-a", delay: "2.2s" },
  { C: Coin, s: 70, left: "54%", top: "12%", op: 0.13, anim: "drift-b", delay: "1.4s" },
];

/** Full-bleed decorative layer behind the home hero. Semi-transparent so content stays
 * readable; several distinct shapes, each drifting on its own timing. */
export function ThemeCritters({ monster }: { monster: boolean }) {
  const items = monster ? MONSTER : DESERT;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it, i) => (
        <div
          key={i}
          className={it.anim}
          style={{ position: "absolute", left: it.left, top: it.top, opacity: it.op, animationDelay: it.delay }}
        >
          <it.C s={it.s} />
        </div>
      ))}
    </div>
  );
}
