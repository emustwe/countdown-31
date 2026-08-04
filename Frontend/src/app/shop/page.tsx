"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Footprints, Layers, Shirt, Sparkles, User as UserIcon } from "lucide-react";
import { PageShell } from "../../components/dune/Shell";
import { AuthGuard } from "../../components/AuthGuard";
import { useProfile } from "../../lib/hooks/useAuth";
import { useCosmetics, useUpdateCosmetics, type CardCosmetics } from "../../lib/hooks/useSponsors";
import {
  CardPreview,
  CARD_COLORS,
  CARD_PATTERNS,
  CARD_SHAPES,
  CARD_BORDERS,
  DEFAULT_CARD,
} from "../../components/dune/CardPreview";

const TABS = [
  { key: "card", label: "Card", Icon: CreditCard },
  { key: "avatar", label: "Avatar", Icon: UserIcon },
  { key: "board", label: "Board", Icon: Layers },
  { key: "cloth", label: "Cloth", Icon: Shirt },
  { key: "shoes", label: "Shoes", Icon: Footprints },
] as const;

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
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("card");
  return (
    <main className="page-main shop-main">
      <section className="page-banner">
        <div>
          <h1>Shop</h1>
          <p>Design your look. Everything here is free while we&apos;re testing.</p>
        </div>
      </section>

      <div className="shop-tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "card" ? <CardDesigner /> : <ComingSoonSection label={TABS.find((t) => t.key === tab)!.label} />}
    </main>
  );
}

function ComingSoonSection({ label }: { label: string }) {
  return (
    <div className="placeholder-card" style={{ margin: "20px auto" }}>
      <span className="placeholder-icon"><Sparkles size={30} /></span>
      <h1>{label} — coming soon</h1>
      <p>Full {label.toLowerCase()} customization is on the way. The Card designer is live now.</p>
    </div>
  );
}

function CardDesigner() {
  const { data: profile } = useProfile();
  const { data: cosmetics } = useCosmetics();
  const update = useUpdateCosmetics();
  const name = profile?.fullName || profile?.email?.split("@")[0] || "Player";

  const [card, setCard] = useState<Required<CardCosmetics>>(DEFAULT_CARD);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load saved cosmetics once they arrive.
  useEffect(() => {
    if (cosmetics?.card) setCard({ ...DEFAULT_CARD, ...cosmetics.card });
  }, [cosmetics]);

  function set<K extends keyof CardCosmetics>(k: K, v: CardCosmetics[K]) {
    setCard((c) => ({ ...c, [k]: v }));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    await update.mutateAsync({ card });
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="shop-designer">
      <div className="shop-preview">
        <CardPreview card={card} name={name} size="lg" />
        <p className="pf-note" style={{ textAlign: "center" }}>This is the card other players see.</p>
      </div>

      <div className="shop-controls admin-card glass">
        <ControlRow label="Skin color">
          <div className="swatches">
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${card.color === c ? "on" : ""}`}
                style={{ background: c }}
                onClick={() => set("color", c)}
                aria-label={`Color ${c}`}
              >
                {card.color === c && <Check size={14} />}
              </button>
            ))}
          </div>
        </ControlRow>

        <ControlRow label="Pattern">
          <Chips options={CARD_PATTERNS} value={card.pattern} onPick={(v) => set("pattern", v)} labels={{ none: "None", stars: "Shining stars", waves: "Waves", circuit: "Circuit" }} />
        </ControlRow>

        <ControlRow label="Shape">
          <Chips options={CARD_SHAPES} value={card.shape} onPick={(v) => set("shape", v)} labels={{ rounded: "Rounded", sharp: "Sharp", pill: "Pill" }} />
        </ControlRow>

        <ControlRow label="Border">
          <Chips options={CARD_BORDERS} value={card.border} onPick={(v) => set("border", v)} labels={{ none: "None", gold: "Gold", neon: "Neon" }} />
        </ControlRow>

        <div className="pf-actions" style={{ marginTop: 10 }}>
          <button className="primary" onClick={save} disabled={update.isPending || !dirty}>
            {update.isPending ? "Saving…" : saved ? "Saved ✓" : "Save card"}
          </button>
        </div>
      </div>
    </div>
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

function Chips<T extends string>({ options, value, onPick, labels }: { options: readonly T[]; value: T; onPick: (v: T) => void; labels: Record<T, string> }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} className={`chip ${value === o ? "on" : ""}`} onClick={() => onPick(o)}>
          {labels[o]}
        </button>
      ))}
    </div>
  );
}
