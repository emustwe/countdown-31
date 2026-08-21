"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Eye, Glasses, Layers, Lock, Palette, Scissors, Shirt, Smile, Sparkles, User, Wallet as WalletIcon } from "lucide-react";
import { PageShell } from "../../components/dune/Shell";
import { AuthGate } from "../../components/AuthGate";
import { useAuthStore } from "../../stores/auth-store";
import { useProfile } from "../../lib/hooks/useAuth";
import { useCosmetics, useUpdateCosmetics, useShop, usePurchaseItem, type Cosmetics } from "../../lib/hooks/useSponsors";
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

function fmtUsdt(baseUnits: string | number | undefined): string {
  return (Number(baseUnits ?? 0) / 1e6).toFixed(2);
}

export default function ShopPage() {
  return (
    <PageShell className="shop-page">
      <ShopContent />
    </PageShell>
  );
}

function ShopContent() {
  const router = useRouter();
  const authed = !!useAuthStore((s) => s.user); // memory-only token (#4) → gate on persisted user
  const { data: profile } = useProfile();
  const { data: saved } = useCosmetics(authed);
  const { data: shop } = useShop(authed);
  const update = useUpdateCosmetics();
  const purchase = usePurchaseItem();
  const name = profile?.fullName || profile?.email?.split("@")[0] || "Player";

  const [cat, setCat] = useState<CatKey>("hair");
  const [cos, setCos] = useState<Cosmetics>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [gate, setGate] = useState(false);
  // A pending purchase the player must confirm (they clicked a locked item).
  const [buy, setBuy] = useState<{ key: string; label: string; apply: () => void } | null>(null);
  const [buyErr, setBuyErr] = useState("");

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
  const owned = new Set(shop?.owned ?? []);
  const priceUsdt = fmtUsdt(shop?.price ?? "500000");
  const balanceUsdt = fmtUsdt(shop?.balance);

  // An item is FREE if it's the basic default for its field, or already purchased.
  function isFree(key: string, isDefault: boolean): boolean {
    return isDefault || owned.has(key);
  }

  function requireAuth(): boolean {
    if (authed) return true;
    setGate(true);
    return false;
  }

  // Apply the selection if free/owned; otherwise open the purchase confirm.
  function pick(key: string, isDefault: boolean, apply: () => void, label: string) {
    if (!requireAuth()) return;
    if (isFree(key, isDefault)) {
      apply();
      return;
    }
    setBuyErr("");
    setBuy({ key, label, apply });
  }

  function setAvatar(key: keyof AvatarConfig, value: string) {
    const apply = () => {
      setCos((c) => ({ ...c, avatar: { ...(c.avatar as object), [key]: value } as Record<string, string> }));
      setDirty(true); setSavedFlag(false);
    };
    pick(`avatar:${key}:${value}`, DEFAULT_AVATAR[key] === value, apply, "this feature");
  }
  function setCard(key: string, value: string) {
    const apply = () => {
      setCos((c) => ({ ...c, card: { ...(c.card as object), [key]: value } }));
      setDirty(true); setSavedFlag(false);
    };
    pick(`card:${key}:${value}`, (DEFAULT_CARD as Record<string, string>)[key] === value, apply, "this card style");
  }
  function setBoard(skin: string) {
    const apply = () => {
      setCos((c) => ({ ...c, board: { skin: skin as "classic" } }));
      setDirty(true); setSavedFlag(false);
    };
    pick(`board:${skin}`, skin === "classic", apply, "this board skin");
  }

  async function confirmBuy() {
    if (!buy) return;
    setBuyErr("");
    try {
      await purchase.mutateAsync(buy.key);
      buy.apply();
      setBuy(null);
    } catch (err) {
      setBuyErr(err instanceof Error ? err.message : "Could not complete purchase");
    }
  }

  async function save() {
    if (!requireAuth()) return;
    await update.mutateAsync(cos);
    setDirty(false); setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  }

  const board = cos.board?.skin ?? "classic";
  // Lock predicates per field (for showing the 🔒/price badge on options).
  const lockAvatar = (field: keyof AvatarConfig) => (v: string) => !isFree(`avatar:${field}:${v}`, DEFAULT_AVATAR[field] === v);
  const lockCardColor = (v: string) => !isFree(`card:color:#${v}`, DEFAULT_CARD.color === `#${v}`);
  const lockCardField = (field: string) => (v: string) => !isFree(`card:${field}:${v}`, (DEFAULT_CARD as Record<string, string>)[field] === v);
  const lockBoard = (v: string) => !isFree(`board:${v}`, v === "classic");

  return (
    <main className="page-main shop-main">
      <section className="page-banner shop-banner">
        <div>
          <h1>Avatar Studio</h1>
          <p>Design your character and card. Every look starts free — premium items cost {priceUsdt} USDT each, paid from your wallet.</p>
        </div>
        {authed && (
          <div className="shop-balance">
            <WalletIcon size={15} /> <b>{balanceUsdt}</b> USDT
            <button className="mini secondary" onClick={() => router.push("/wallet")}>Top up</button>
          </div>
        )}
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
            {cat === "skin" && <SwatchRow label="Skin tone" colors={SKIN_TONES} value={av.skin} onPick={(v) => setAvatar("skin", v)} locked={lockAvatar("skin")} />}

            {cat === "hair" && (
              <>
                <FeatureGrid label="Style" options={TOPS} field="top" av={av} onPick={(v) => setAvatar("top", v)} locked={lockAvatar("top")} />
                <SwatchRow label="Hair color" colors={HAIR_COLORS} value={av.hairColor} onPick={(v) => setAvatar("hairColor", v)} locked={lockAvatar("hairColor")} />
              </>
            )}
            {cat === "eyes" && <FeatureGrid label="Eyes" options={EYES} field="eyes" av={av} onPick={(v) => setAvatar("eyes", v)} locked={lockAvatar("eyes")} />}
            {cat === "eyebrows" && <FeatureGrid label="Eyebrows" options={EYEBROWS} field="eyebrows" av={av} onPick={(v) => setAvatar("eyebrows", v)} locked={lockAvatar("eyebrows")} />}
            {cat === "mouth" && <FeatureGrid label="Mouth" options={MOUTHS} field="mouth" av={av} onPick={(v) => setAvatar("mouth", v)} locked={lockAvatar("mouth")} />}
            {cat === "facialHair" && (
              <>
                <FeatureGrid label="Facial hair" options={FACIAL_HAIR} field="facialHair" av={av} onPick={(v) => setAvatar("facialHair", v)} locked={lockAvatar("facialHair")} />
                <SwatchRow label="Beard color" colors={HAIR_COLORS} value={av.facialHairColor} onPick={(v) => setAvatar("facialHairColor", v)} locked={lockAvatar("facialHairColor")} />
              </>
            )}
            {cat === "glasses" && <FeatureGrid label="Glasses" options={GLASSES} field="glasses" av={av} onPick={(v) => setAvatar("glasses", v)} locked={lockAvatar("glasses")} />}
            {cat === "clothing" && (
              <>
                <FeatureGrid label="Outfit" options={CLOTHING} field="clothing" av={av} onPick={(v) => setAvatar("clothing", v)} locked={lockAvatar("clothing")} />
                <SwatchRow label="Outfit color" colors={CLOTHES_COLORS} value={av.clothesColor} onPick={(v) => setAvatar("clothesColor", v)} locked={lockAvatar("clothesColor")} />
              </>
            )}
            {cat === "card" && (
              <>
                <SwatchRow label="Card color" colors={CARD_COLORS.map((c) => c.slice(1))} value={(cos.card?.color ?? "").slice(1)} onPick={(v) => setCard("color", "#" + v)} locked={lockCardColor} />
                <ChipRow label="Pattern" options={CARD_PATTERNS} value={cos.card?.pattern ?? "stars"} onPick={(v) => setCard("pattern", v)} labels={{ none: "None", stars: "Shining stars", waves: "Waves", circuit: "Circuit" }} locked={lockCardField("pattern")} />
                <ChipRow label="Shape" options={CARD_SHAPES} value={cos.card?.shape ?? "rounded"} onPick={(v) => setCard("shape", v)} labels={{ rounded: "Rounded", sharp: "Sharp", pill: "Pill" }} locked={lockCardField("shape")} />
                <ChipRow label="Border" options={CARD_BORDERS} value={cos.card?.border ?? "gold"} onPick={(v) => setCard("border", v)} labels={{ none: "None", gold: "Gold", neon: "Neon" }} locked={lockCardField("border")} />
              </>
            )}
            {cat === "board" && (
              <ChipRow label="Board skin" options={BOARD_SKINS.map((b) => b.key)} value={board} onPick={setBoard} labels={Object.fromEntries(BOARD_SKINS.map((b) => [b.key, b.label]))} locked={lockBoard} />
            )}
          </div>
        </div>
      </div>

      {/* Purchase confirmation */}
      {buy && (
        <div className="modal-overlay" onClick={() => setBuy(null)}>
          <div className="modal-card confirm-card" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <span className="confirm-ico"><Lock size={22} /></span>
            <h2 style={{ marginTop: 0 }}>Unlock {buy.label}?</h2>
            <p className="muted">This item costs <b>{priceUsdt} USDT</b>, paid from your wallet. You&apos;ll own it permanently.</p>
            <p className="muted" style={{ fontSize: 12 }}>Balance: {balanceUsdt} USDT</p>
            {buyErr && <div className="sponsor-auth-err" style={{ marginTop: 6 }}>{buyErr}</div>}
            <div className="confirm-actions">
              <button className="secondary" onClick={() => setBuy(null)} disabled={purchase.isPending}>Cancel</button>
              {Number(shop?.balance ?? 0) < Number(shop?.price ?? 0) ? (
                <button className="primary" onClick={() => router.push("/wallet")}>Deposit USDT</button>
              ) : (
                <button className="primary" onClick={confirmBuy} disabled={purchase.isPending}>
                  {purchase.isPending ? "Buying…" : `Buy for ${priceUsdt} USDT`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthGate
        open={gate}
        onClose={() => setGate(false)}
        title="Sign up to try items"
        message="Create an account or log in to try on and save your look."
      />
    </main>
  );
}

function FeatureGrid({ label, options, field, av, onPick, locked }: { label: string; options: string[]; field: keyof AvatarConfig; av: AvatarConfig; onPick: (v: string) => void; locked?: (v: string) => boolean }) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="feature-grid">
        {options.map((o) => (
          <button key={o} className={`feature-thumb ${av[field] === o ? "on" : ""} ${locked?.(o) ? "locked" : ""}`} onClick={() => onPick(o)} title={o}>
            <AvatarThumb config={{ ...av, [field]: o }} size={66} />
            {locked?.(o) && <span className="lock-badge"><Lock size={11} /></span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function SwatchRow({ label, colors, value, onPick, locked }: { label: string; colors: readonly string[]; value?: string; onPick: (v: string) => void; locked?: (v: string) => boolean }) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="swatches">
        {colors.map((c) => (
          <button key={c} className={`swatch ${value === c ? "on" : ""} ${locked?.(c) ? "locked" : ""}`} style={{ background: "#" + c }} onClick={() => onPick(c)} aria-label={c}>
            {value === c && <Check size={14} />}
            {value !== c && locked?.(c) && <span className="lock-badge sm"><Lock size={10} /></span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipRow<T extends string>({ label, options, value, onPick, labels, locked }: { label: string; options: readonly T[]; value: T; onPick: (v: T) => void; labels: Record<string, string>; locked?: (v: string) => boolean }) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="chips">
        {options.map((o) => (
          <button key={o} className={`chip ${value === o ? "on" : ""} ${locked?.(o) ? "locked" : ""}`} onClick={() => onPick(o)}>
            {locked?.(o) && <Lock size={11} />} {labels[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}
