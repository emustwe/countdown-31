"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Footprints, Layers, Shirt, User as UserIcon } from "lucide-react";
import { PageShell } from "../../components/dune/Shell";
import { AuthGuard } from "../../components/AuthGuard";
import { useProfile } from "../../lib/hooks/useAuth";
import { useCosmetics, useUpdateCosmetics, type Cosmetics } from "../../lib/hooks/useSponsors";
import { CardPreview, CARD_COLORS, CARD_PATTERNS, CARD_SHAPES, CARD_BORDERS, DEFAULT_CARD } from "../../components/dune/CardPreview";
import {
  Avatar,
  SKIN_TONES,
  HAIR_COLORS,
  OUTFITS,
  OUTFIT_COLORS,
  SHOE_STYLES,
  SHOE_COLORS,
  DEFAULT_AVATAR,
  DEFAULT_CLOTH,
  DEFAULT_SHOES,
} from "../../components/dune/Avatar";

const TABS = [
  { key: "card", label: "Card", Icon: CreditCard },
  { key: "avatar", label: "Avatar", Icon: UserIcon },
  { key: "board", label: "Board", Icon: Layers },
  { key: "cloth", label: "Cloth", Icon: Shirt },
  { key: "shoes", label: "Shoes", Icon: Footprints },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const BOARD_SKINS = [
  { key: "classic", label: "Classic" },
  { key: "neon", label: "Neon" },
  { key: "sunset", label: "Sunset" },
  { key: "carbon", label: "Carbon" },
] as const;

const DEFAULTS: Cosmetics = { card: DEFAULT_CARD, avatar: DEFAULT_AVATAR, cloth: DEFAULT_CLOTH, shoes: DEFAULT_SHOES, board: { skin: "classic" } };

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

  const [tab, setTab] = useState<TabKey>("card");
  const [cos, setCos] = useState<Cosmetics>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (saved) {
      setCos({
        card: { ...DEFAULT_CARD, ...(saved.card ?? {}) },
        avatar: { ...DEFAULT_AVATAR, ...(saved.avatar ?? {}) },
        cloth: { ...DEFAULT_CLOTH, ...(saved.cloth ?? {}) },
        shoes: { ...DEFAULT_SHOES, ...(saved.shoes ?? {}) },
        board: { skin: saved.board?.skin ?? "classic" },
      });
    }
  }, [saved]);

  function patch<K extends keyof Cosmetics>(section: K, value: Partial<NonNullable<Cosmetics[K]>>) {
    setCos((c) => ({ ...c, [section]: { ...(c[section] as object), ...value } }));
    setDirty(true);
    setSavedFlag(false);
  }

  async function save() {
    await update.mutateAsync(cos);
    setDirty(false);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  }

  return (
    <main className="page-main shop-main">
      <section className="page-banner">
        <div>
          <h1>Shop</h1>
          <p>Design your card and full-body avatar. Everything is free while we&apos;re testing.</p>
        </div>
      </section>

      <div className="shop-tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="shop-designer">
        {/* Live preview: the card (with avatar on it) + a full-body view */}
        <div className="shop-preview">
          <CardPreview card={cos.card} avatar={cos.avatar} cloth={cos.cloth} shoes={cos.shoes} name={name} size="lg" />
          {tab !== "card" && tab !== "board" && (
            <div className={`avatar-stage board-skin-${cos.board?.skin ?? "classic"}`}>
              <Avatar className="avatar-full" av={cos.avatar} cloth={cos.cloth} shoes={cos.shoes} />
              <span className="avatar-stage-label">Full view</span>
            </div>
          )}
          {tab === "board" && (
            <div className={`board-preview board-skin-${cos.board?.skin ?? "classic"}`}>
              <span>Game board</span>
            </div>
          )}
        </div>

        {/* Controls per tab */}
        <div className="shop-controls admin-card glass">
          {tab === "card" && (
            <>
              <ControlRow label="Skin color">
                <Swatches colors={CARD_COLORS} value={cos.card?.color} onPick={(v) => patch("card", { color: v })} />
              </ControlRow>
              <ControlRow label="Pattern">
                <Chips options={CARD_PATTERNS} value={cos.card?.pattern ?? "stars"} onPick={(v) => patch("card", { pattern: v })} labels={{ none: "None", stars: "Shining stars", waves: "Waves", circuit: "Circuit" }} />
              </ControlRow>
              <ControlRow label="Shape">
                <Chips options={CARD_SHAPES} value={cos.card?.shape ?? "rounded"} onPick={(v) => patch("card", { shape: v })} labels={{ rounded: "Rounded", sharp: "Sharp", pill: "Pill" }} />
              </ControlRow>
              <ControlRow label="Border">
                <Chips options={CARD_BORDERS} value={cos.card?.border ?? "gold"} onPick={(v) => patch("card", { border: v })} labels={{ none: "None", gold: "Gold", neon: "Neon" }} />
              </ControlRow>
            </>
          )}

          {tab === "avatar" && (
            <>
              <ControlRow label="Base">
                <Chips options={["male", "female"] as const} value={cos.avatar?.gender ?? "male"} onPick={(v) => patch("avatar", { gender: v })} labels={{ male: "Male", female: "Female" }} />
              </ControlRow>
              <ControlRow label="Skin tone">
                <Swatches colors={SKIN_TONES} value={cos.avatar?.skin} onPick={(v) => patch("avatar", { skin: v })} />
              </ControlRow>
              <ControlRow label="Hair color">
                <Swatches colors={HAIR_COLORS} value={cos.avatar?.hair} onPick={(v) => patch("avatar", { hair: v })} />
              </ControlRow>
            </>
          )}

          {tab === "cloth" && (
            <>
              <ControlRow label="Outfit">
                <Chips options={OUTFITS.map((o) => o.key)} value={cos.cloth?.outfit ?? "tee"} onPick={(v) => patch("cloth", { outfit: v })} labels={Object.fromEntries(OUTFITS.map((o) => [o.key, o.label])) as Record<string, string>} />
              </ControlRow>
              <ControlRow label="Color">
                <Swatches colors={OUTFIT_COLORS} value={cos.cloth?.color} onPick={(v) => patch("cloth", { color: v })} />
              </ControlRow>
            </>
          )}

          {tab === "shoes" && (
            <>
              <ControlRow label="Style">
                <Chips options={SHOE_STYLES.map((o) => o.key)} value={cos.shoes?.style ?? "sneakers"} onPick={(v) => patch("shoes", { style: v })} labels={Object.fromEntries(SHOE_STYLES.map((o) => [o.key, o.label])) as Record<string, string>} />
              </ControlRow>
              <ControlRow label="Color">
                <Swatches colors={SHOE_COLORS} value={cos.shoes?.color} onPick={(v) => patch("shoes", { color: v })} />
              </ControlRow>
            </>
          )}

          {tab === "board" && (
            <ControlRow label="Board skin">
              <Chips options={BOARD_SKINS.map((b) => b.key)} value={cos.board?.skin ?? "classic"} onPick={(v) => patch("board", { skin: v })} labels={Object.fromEntries(BOARD_SKINS.map((b) => [b.key, b.label])) as Record<string, string>} />
            </ControlRow>
          )}

          <div className="pf-actions" style={{ marginTop: 12 }}>
            <button className="primary" onClick={save} disabled={update.isPending || !dirty}>
              {update.isPending ? "Saving…" : savedFlag ? "Saved ✓" : "Save look"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      {children}
    </div>
  );
}

function Swatches({ colors, value, onPick }: { colors: readonly string[]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="swatches">
      {colors.map((c) => (
        <button key={c} className={`swatch ${value === c ? "on" : ""}`} style={{ background: c }} onClick={() => onPick(c)} aria-label={`Color ${c}`}>
          {value === c && <Check size={14} />}
        </button>
      ))}
    </div>
  );
}

function Chips<T extends string>({ options, value, onPick, labels }: { options: readonly T[]; value: T; onPick: (v: T) => void; labels: Record<string, string> }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} className={`chip ${value === o ? "on" : ""}`} onClick={() => onPick(o)}>
          {labels[o] ?? o}
        </button>
      ))}
    </div>
  );
}
