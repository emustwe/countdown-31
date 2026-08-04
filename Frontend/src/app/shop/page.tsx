"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Eye, Footprints, Glasses, Layers, Palette, PersonStanding, Scissors, Shirt, Smile, Sparkles, User } from "lucide-react";
import { PageShell } from "../../components/dune/Shell";
import { AuthGuard } from "../../components/AuthGuard";
import { useProfile } from "../../lib/hooks/useAuth";
import { useCosmetics, useUpdateCosmetics, type Cosmetics } from "../../lib/hooks/useSponsors";
import { CardPreview, CARD_COLORS, CARD_PATTERNS, CARD_SHAPES, CARD_BORDERS, DEFAULT_CARD } from "../../components/dune/CardPreview";
import {
  Avatar,
  AvatarThumb,
  type AvatarConfig,
  DEFAULT_AVATAR,
  TOPS,
  HAIR_COLORS,
  SKIN_TONES,
  EYES,
  EYEBROWS,
  MOUTHS,
  FACIAL_HAIR,
  GLASSES,
  CLOTHING,
  CLOTHES_COLORS,
  PANTS_COLORS,
  SHOE_STYLES,
  SHOE_COLORS,
} from "../../components/dune/Avatar";

const CATS = [
  { key: "skin", label: "Skin", Icon: Palette },
  { key: "hair", label: "Hair", Icon: Scissors },
  { key: "eyes", label: "Eyes", Icon: Eye },
  { key: "eyebrows", label: "Brows", Icon: Sparkles },
  { key: "mouth", label: "Mouth", Icon: Smile },
  { key: "facialHair", label: "Beard", Icon: User },
  { key: "glasses", label: "Glasses", Icon: Glasses },
  { key: "clothing", label: "Clothes", Icon: Shirt },
  { key: "pants", label: "Pants", Icon: PersonStanding },
  { key: "shoes", label: "Shoes", Icon: Footprints },
  { key: "card", label: "Card", Icon: CreditCard },
  { key: "board", label: "Board", Icon: Layers },
] as const;
type CatKey = (typeof CATS)[number]["key"];

const BOARD_SKINS = [
  { key: "classic", label: "Classic" },
  { key: "neon", label: "Neon" },
  { key: "sunset", label: "Sunset" },
  { key: "carbon", label: "Carbon" },
] as const;

const DEFAULTS: Cosmetics = { card: DEFAULT_CARD, avatar: DEFAULT_AVATAR as unknown as Record<string, string>, board: { skin: "classic" } };

export default function ShopPage() {
  return (
    <AuthGuard>
      <PageShell className="shop-page">
        <ShopContent />
      </PageShell>
    </AuthGuard>
  );
}

function ShopContent() {
  const { data: profile } = useProfile();
  const { data: saved } = useCosmetics();
  const update = useUpdateCosmetics();
  const name = profile?.fullName || profile?.email?.split("@")[0] || "Player";

  const [cat, setCat] = useState<CatKey>("hair");
  const [cos, setCos] = useState<Cosmetics>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (saved) {
      setCos({
        card: { ...DEFAULT_CARD, ...(saved.card ?? {}) },
        avatar: { ...DEFAULT_AVATAR, ...(saved.avatar ?? {}) } as unknown as Record<string, string>,
        board: { skin: saved.board?.skin ?? "classic" },
      });
    }
  }, [saved]);

  const av = cos.avatar as unknown as AvatarConfig;

  function setAvatar(key: keyof AvatarConfig, value: string) {
    setCos((c) => ({ ...c, avatar: { ...(c.avatar as object), [key]: value } as Record<string, string> }));
    setDirty(true); setSavedFlag(false);
  }
  function setCard(key: string, value: string) {
    setCos((c) => ({ ...c, card: { ...(c.card as object), [key]: value } }));
    setDirty(true); setSavedFlag(false);
  }
  function setBoard(skin: string) {
    setCos((c) => ({ ...c, board: { skin: skin as "classic" } }));
    setDirty(true); setSavedFlag(false);
  }

  async function save() {
    await update.mutateAsync(cos);
    setDirty(false); setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  }

  const board = cos.board?.skin ?? "classic";

  return (
    <main className="page-main shop-main">
      <section className="page-banner">
        <div>
          <h1>Avatar Studio</h1>
          <p>Design your character and card. Everything is free while we&apos;re testing.</p>
        </div>
      </section>

      <div className="studio">
        {/* Live preview */}
        <div className="studio-preview">
          <div className={`avatar-stage board-skin-${board}`}>
            <Avatar className="avatar-full" config={av} />
          </div>
          <CardPreview card={cos.card} avatar={cos.avatar} name={name} size="md" />
          <button className="primary studio-save" onClick={save} disabled={update.isPending || !dirty}>
            {update.isPending ? "Saving…" : savedFlag ? "Saved ✓" : "Save look"}
          </button>
        </div>

        {/* Editor */}
        <div className="studio-editor">
          <div className="studio-cats">
            {CATS.map(({ key, label, Icon }) => (
              <button key={key} className={cat === key ? "active" : ""} onClick={() => setCat(key)}>
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="studio-panel admin-card glass">
            {cat === "skin" && <SwatchRow label="Skin tone" colors={SKIN_TONES} value={av.skin} onPick={(v) => setAvatar("skin", v)} />}

            {cat === "hair" && (
              <>
                <FeatureGrid label="Style" options={TOPS} field="top" av={av} onPick={(v) => setAvatar("top", v)} />
                <SwatchRow label="Hair color" colors={HAIR_COLORS} value={av.hairColor} onPick={(v) => setAvatar("hairColor", v)} />
              </>
            )}
            {cat === "eyes" && <FeatureGrid label="Eyes" options={EYES} field="eyes" av={av} onPick={(v) => setAvatar("eyes", v)} />}
            {cat === "eyebrows" && <FeatureGrid label="Eyebrows" options={EYEBROWS} field="eyebrows" av={av} onPick={(v) => setAvatar("eyebrows", v)} />}
            {cat === "mouth" && <FeatureGrid label="Mouth" options={MOUTHS} field="mouth" av={av} onPick={(v) => setAvatar("mouth", v)} />}
            {cat === "facialHair" && (
              <>
                <FeatureGrid label="Facial hair" options={FACIAL_HAIR} field="facialHair" av={av} onPick={(v) => setAvatar("facialHair", v)} />
                <SwatchRow label="Beard color" colors={HAIR_COLORS} value={av.facialHairColor} onPick={(v) => setAvatar("facialHairColor", v)} />
              </>
            )}
            {cat === "glasses" && <FeatureGrid label="Glasses" options={GLASSES} field="glasses" av={av} onPick={(v) => setAvatar("glasses", v)} />}
            {cat === "clothing" && (
              <>
                <FeatureGrid label="Outfit" options={CLOTHING} field="clothing" av={av} onPick={(v) => setAvatar("clothing", v)} />
                <SwatchRow label="Outfit color" colors={CLOTHES_COLORS} value={av.clothesColor} onPick={(v) => setAvatar("clothesColor", v)} />
              </>
            )}
            {cat === "pants" && <SwatchRow label="Pants color" colors={PANTS_COLORS} value={av.pants} onPick={(v) => setAvatar("pants", v)} />}
            {cat === "shoes" && (
              <>
                <ChipRow label="Style" options={SHOE_STYLES} value={av.shoeStyle} onPick={(v) => setAvatar("shoeStyle", v)} labels={{ sneakers: "Sneakers", boots: "Boots" }} />
                <SwatchRow label="Shoe color" colors={SHOE_COLORS} value={av.shoeColor} onPick={(v) => setAvatar("shoeColor", v)} />
              </>
            )}
            {cat === "card" && (
              <>
                <SwatchRow label="Card color" colors={CARD_COLORS.map((c) => c.slice(1))} value={(cos.card?.color ?? "").slice(1)} onPick={(v) => setCard("color", "#" + v)} />
                <ChipRow label="Pattern" options={CARD_PATTERNS} value={cos.card?.pattern ?? "stars"} onPick={(v) => setCard("pattern", v)} labels={{ none: "None", stars: "Shining stars", waves: "Waves", circuit: "Circuit" }} />
                <ChipRow label="Shape" options={CARD_SHAPES} value={cos.card?.shape ?? "rounded"} onPick={(v) => setCard("shape", v)} labels={{ rounded: "Rounded", sharp: "Sharp", pill: "Pill" }} />
                <ChipRow label="Border" options={CARD_BORDERS} value={cos.card?.border ?? "gold"} onPick={(v) => setCard("border", v)} labels={{ none: "None", gold: "Gold", neon: "Neon" }} />
              </>
            )}
            {cat === "board" && (
              <ChipRow label="Board skin" options={BOARD_SKINS.map((b) => b.key)} value={board} onPick={setBoard} labels={Object.fromEntries(BOARD_SKINS.map((b) => [b.key, b.label]))} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureGrid({ label, options, field, av, onPick }: { label: string; options: string[]; field: keyof AvatarConfig; av: AvatarConfig; onPick: (v: string) => void }) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="feature-grid">
        {options.map((o) => (
          <button key={o} className={`feature-thumb ${av[field] === o ? "on" : ""}`} onClick={() => onPick(o)} title={o}>
            <AvatarThumb config={{ ...av, [field]: o }} size={66} />
          </button>
        ))}
      </div>
    </div>
  );
}

function SwatchRow({ label, colors, value, onPick }: { label: string; colors: readonly string[]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="swatches">
        {colors.map((c) => (
          <button key={c} className={`swatch ${value === c ? "on" : ""}`} style={{ background: "#" + c }} onClick={() => onPick(c)} aria-label={c}>
            {value === c && <Check size={14} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipRow<T extends string>({ label, options, value, onPick, labels }: { label: string; options: readonly T[]; value: T; onPick: (v: T) => void; labels: Record<string, string> }) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="chips">
        {options.map((o) => (
          <button key={o} className={`chip ${value === o ? "on" : ""}`} onClick={() => onPick(o)}>
            {labels[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}
