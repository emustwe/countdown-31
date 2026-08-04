"use client";

// A stylized full-body avatar rendered as pure SVG so it scales crisply and recolours instantly.
// Everything is driven by the user's shop cosmetics (gender base, skin + hair colour, outfit and
// shoes), so the same figure appears on the player card, in the Shop preview and in Settings.

export type Gender = "male" | "female";
export type Outfit = "tee" | "hoodie" | "suit" | "jersey";
export type ShoeStyle = "sneakers" | "boots";

export interface AvatarCosmetics { gender?: Gender; skin?: string; hair?: string }
export interface ClothCosmetics { outfit?: Outfit; color?: string }
export interface ShoesCosmetics { style?: ShoeStyle; color?: string }

export const SKIN_TONES = ["#ffe0bd", "#f2c9a0", "#e0a878", "#c68642", "#8d5524", "#5c3a21"];
export const HAIR_COLORS = ["#2b2b2b", "#5a3821", "#b5651d", "#e6c35c", "#c8c8c8", "#8a4bd4", "#d94f8a"];
export const OUTFITS: { key: Outfit; label: string }[] = [
  { key: "tee", label: "T-shirt" },
  { key: "hoodie", label: "Hoodie" },
  { key: "suit", label: "Suit" },
  { key: "jersey", label: "Jersey" },
];
export const OUTFIT_COLORS = ["#5aa8ff", "#ff6b7f", "#5adc8c", "#f4b942", "#c87bff", "#26c6da", "#e0e0e0", "#ff8a3d"];
export const SHOE_STYLES: { key: ShoeStyle; label: string }[] = [
  { key: "sneakers", label: "Sneakers" },
  { key: "boots", label: "Boots" },
];
export const SHOE_COLORS = ["#ffffff", "#222222", "#ff5252", "#3d7bff", "#f4b942", "#5adc8c"];

export const DEFAULT_AVATAR: Required<AvatarCosmetics> = { gender: "male", skin: "#f2c9a0", hair: "#2b2b2b" };
export const DEFAULT_CLOTH: Required<ClothCosmetics> = { outfit: "tee", color: "#5aa8ff" };
export const DEFAULT_SHOES: Required<ShoesCosmetics> = { style: "sneakers", color: "#ffffff" };

// Darken a hex colour by a factor (for shading).
function shade(hex: string, f: number): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(0, 2), 16) * f)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(2, 4), 16) * f)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(4, 6), 16) * f)));
  return `rgb(${r},${g},${b})`;
}

export function Avatar({
  av,
  cloth,
  shoes,
  className,
}: {
  av?: AvatarCosmetics;
  cloth?: ClothCosmetics;
  shoes?: ShoesCosmetics;
  className?: string;
}) {
  const a = { ...DEFAULT_AVATAR, ...(av ?? {}) };
  const c = { ...DEFAULT_CLOTH, ...(cloth ?? {}) };
  const s = { ...DEFAULT_SHOES, ...(shoes ?? {}) };
  const female = a.gender === "female";

  const skin = a.skin;
  const skinDark = shade(skin, 0.9);
  const top = c.color;
  const topDark = shade(top, 0.82);
  const pants = "#3a3552";
  const pantsDark = shade(pants, 0.85);
  const hairC = a.hair;
  const shoe = s.color;
  const shoeDark = shade(shoe, 0.8);

  // Sleeves: tee = bare forearms (skin); everything else = full sleeves (outfit colour).
  const sleeveIsSkin = c.outfit === "tee";
  // Shoulder width — males a touch broader.
  const shoulder = female ? 34 : 30;

  return (
    <svg className={className} viewBox="0 0 140 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Player avatar">
      {/* ground shadow */}
      <ellipse cx="70" cy="258" rx="40" ry="7" fill="rgba(0,0,0,0.28)" />

      {/* back hair (long) for female, drawn behind the body */}
      {female && (
        <path d="M42 60 Q40 120 48 150 L92 150 Q100 120 98 60 Z" fill={shade(hairC, 0.85)} />
      )}

      {/* legs */}
      <rect x="58" y="168" width="11" height="62" rx="5" fill={pants} />
      <rect x="71" y="168" width="11" height="62" rx="5" fill={pantsDark} />

      {/* shoes */}
      {s.style === "sneakers" ? (
        <>
          <rect x="52" y="224" width="21" height="16" rx="7" fill={shoe} />
          <rect x="67" y="224" width="21" height="16" rx="7" fill={shoeDark} />
          <rect x="52" y="234" width="21" height="6" rx="3" fill={shade(shoe, 0.7)} />
          <rect x="67" y="234" width="21" height="6" rx="3" fill={shade(shoe, 0.6)} />
        </>
      ) : (
        <>
          <rect x="54" y="214" width="17" height="26" rx="5" fill={shoe} />
          <rect x="69" y="214" width="17" height="26" rx="5" fill={shoeDark} />
        </>
      )}

      {/* arms */}
      <rect x={70 - shoulder - 8} y="96" width="12" height="58" rx="6" fill={sleeveIsSkin ? skin : top} />
      <rect x={70 + shoulder - 4} y="96" width="12" height="58" rx="6" fill={sleeveIsSkin ? skinDark : topDark} />
      {sleeveIsSkin && (
        <>
          <rect x={70 - shoulder - 8} y="96" width="12" height="24" rx="6" fill={top} />
          <rect x={70 + shoulder - 4} y="96" width="12" height="24" rx="6" fill={topDark} />
        </>
      )}
      {/* hands */}
      <circle cx={70 - shoulder - 2} cy="156" r="7" fill={skin} />
      <circle cx={70 + shoulder + 2} cy="156" r="7" fill={skinDark} />

      {/* torso / top */}
      <path
        d={`M${70 - shoulder} 96 Q70 88 ${70 + shoulder} 96 L${70 + shoulder - 4} 168 Q70 176 ${70 - shoulder + 4} 168 Z`}
        fill={top}
      />
      {/* torso shading (right half) */}
      <path d={`M70 90 L${70 + shoulder} 96 L${70 + shoulder - 4} 168 Q70 176 70 172 Z`} fill={topDark} opacity="0.5" />

      {/* outfit details */}
      {c.outfit === "suit" && (
        <>
          <path d={`M70 90 L58 104 L70 150 L82 104 Z`} fill="#f4f6fb" />
          <path d={`M70 92 L64 104 L70 140 L76 104 Z`} fill={shade(top, 0.5)} />
          <rect x="67" y="104" width="6" height="30" rx="2" fill="#c0392b" />
        </>
      )}
      {c.outfit === "hoodie" && (
        <>
          <path d={`M${70 - shoulder + 4} 96 Q70 82 ${70 + shoulder - 4} 96 Q70 104 ${70 - shoulder + 4} 96 Z`} fill={topDark} />
          <rect x="58" y="130" width="24" height="18" rx="6" fill={topDark} opacity="0.7" />
          <rect x="66" y="96" width="2.5" height="20" fill="#fff" opacity="0.7" />
          <rect x="72" y="96" width="2.5" height="20" fill="#fff" opacity="0.7" />
        </>
      )}
      {c.outfit === "jersey" && (
        <>
          <rect x={70 - shoulder + 3} y="120" width={2 * shoulder - 6} height="7" fill="#fff" opacity="0.85" />
          <text x="70" y="150" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" opacity="0.9" fontFamily="system-ui, sans-serif">10</text>
        </>
      )}

      {/* neck */}
      <rect x="63" y="78" width="14" height="16" rx="5" fill={skinDark} />

      {/* head */}
      <circle cx="70" cy="54" r="27" fill={skin} />
      {/* ears */}
      <circle cx="44" cy="56" r="5" fill={skinDark} />
      <circle cx="96" cy="56" r="5" fill={skinDark} />

      {/* hair (front) */}
      {female ? (
        <path d="M43 52 Q42 22 70 20 Q98 22 97 52 Q90 36 70 34 Q50 36 43 52 Z" fill={hairC} />
      ) : (
        <path d="M45 50 Q46 24 70 23 Q94 24 95 50 Q92 38 70 37 Q48 38 45 50 Z" fill={hairC} />
      )}

      {/* face */}
      <circle cx="60" cy="56" r="3" fill="#2a2a33" />
      <circle cx="80" cy="56" r="3" fill="#2a2a33" />
      <circle cx="61" cy="55" r="1" fill="#fff" />
      <circle cx="81" cy="55" r="1" fill="#fff" />
      <path d="M62 66 Q70 72 78 66" stroke={shade(skin, 0.6)} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="54" cy="63" r="3.5" fill="#ff9a9a" opacity="0.35" />
      <circle cx="86" cy="63" r="3.5" fill="#ff9a9a" opacity="0.35" />
    </svg>
  );
}
